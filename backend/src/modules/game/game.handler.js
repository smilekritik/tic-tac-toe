const gameStateService = require('./game.state');
const { createEngine } = require('./engine/game.engine');
const { getModeModule } = require('./engine/game-modes');
const prisma = require('../../lib/prisma');
const { sanitizeChatText } = require('./chat.sanitizer');
const { TURN_TIMEOUT_MS, ELO_K_FACTOR, CHAT_RATE_LIMIT_MS } = require('./game.constants');

function getMatchEngine(match) {
  return createEngine(getModeModule(match?.gameMode?.code));
}

function serializeMatchState(match) {
  const engine = getMatchEngine(match);
  const serializedState = engine.serialize(match.gameState);

  return {
    ...serializedState,
    playerX: match.playerX.username,
    playerO: match.playerO.username,
    turnDeadlineAt: match.turnDeadlineAt,
    nextRemovalPosition: serializedState.nextRemovalPosition ?? null,
    gameMode: match.gameMode
      ? {
        code: match.gameMode.code,
        name: match.gameMode.name,
      }
      : null,
  };
}

function emitMatchState(io, matchId, match) {
  io.to(`match:${matchId}`).emit('game:state', serializeMatchState(match));
}

function buildTimerPayload(matchId, match) {
  if (!match?.gameState || !match.turnDeadlineAt) return null;

  return {
    matchId,
    currentSymbol: match.gameState.currentSymbol,
    turnDeadlineAt: match.turnDeadlineAt,
  };
}

function emitTimerUpdate(target, matchId, match) {
  const payload = buildTimerPayload(matchId, match);
  if (!payload) return;
  target.emit('game:timer-update', payload);
}

function emitChatHistory(target, match) {
  target.emit('game:chat-history', {
    messages: match.chatMessages || [],
  });
}

function getMatchScores(match, winnerId, reason) {
  if (reason === 'draw') {
    return { scoreX: 0.5, scoreO: 0.5 };
  }

  if (!winnerId) return null;

  if (winnerId === match.playerX.userId) {
    return { scoreX: 1, scoreO: 0 };
  }

  if (winnerId === match.playerO.userId) {
    return { scoreX: 0, scoreO: 1 };
  }

  return null;
}

function calculateExpectedScore(playerRating, opponentRating) {
  return 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
}

function calculateRatingDelta(playerRating, opponentRating, actualScore) {
  const expectedScore = calculateExpectedScore(playerRating, opponentRating);
  return Math.round(ELO_K_FACTOR * (actualScore - expectedScore));
}

function buildRatingUpdate(rating, score, delta) {
  const isWin = score === 1;
  const isDraw = score === 0.5;
  const nextWinStreak = isWin ? rating.winStreak + 1 : 0;

  return {
    eloRating: rating.eloRating + delta,
    gamesPlayed: rating.gamesPlayed + 1,
    wins: rating.wins + (isWin ? 1 : 0),
    losses: rating.losses + (score === 0 ? 1 : 0),
    draws: rating.draws + (isDraw ? 1 : 0),
    winStreak: nextWinStreak,
    maxWinStreak: Math.max(rating.maxWinStreak, nextWinStreak),
  };
}

async function applyMatchRatingResult(matchId, match, winnerId, reason) {
  const dbMatch = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      gameModeId: true,
      matchType: true,
      startedAt: true,
      gameMode: {
        select: {
          isRanked: true,
        },
      },
    },
  });

  const scores = getMatchScores(match, winnerId, reason);
  if (!dbMatch || !scores) {
    return { ratingDeltaX: null, ratingDeltaO: null };
  }

  if (!dbMatch.startedAt || dbMatch.matchType !== 'ranked' || !dbMatch.gameMode?.isRanked) {
    return { ratingDeltaX: null, ratingDeltaO: null };
  }

  return prisma.$transaction(async (tx) => {
    const [ratingX, ratingO] = await Promise.all([
      tx.userRating.upsert({
        where: {
          userId_gameModeId: {
            userId: match.playerX.userId,
            gameModeId: dbMatch.gameModeId,
          },
        },
        update: {},
        create: {
          userId: match.playerX.userId,
          gameModeId: dbMatch.gameModeId,
        },
      }),
      tx.userRating.upsert({
        where: {
          userId_gameModeId: {
            userId: match.playerO.userId,
            gameModeId: dbMatch.gameModeId,
          },
        },
        update: {},
        create: {
          userId: match.playerO.userId,
          gameModeId: dbMatch.gameModeId,
        },
      }),
    ]);

    const ratingDeltaX = calculateRatingDelta(ratingX.eloRating, ratingO.eloRating, scores.scoreX);
    const ratingDeltaO = -ratingDeltaX;

    await Promise.all([
      tx.userRating.update({
        where: { id: ratingX.id },
        data: buildRatingUpdate(ratingX, scores.scoreX, ratingDeltaX),
      }),
      tx.userRating.update({
        where: { id: ratingO.id },
        data: buildRatingUpdate(ratingO, scores.scoreO, ratingDeltaO),
      }),
    ]);

    return { ratingDeltaX, ratingDeltaO };
  });
}

function clearTurnTimer(matchId) {
  const match = gameStateService.getMatch(matchId);
  if (!match) return;

  if (match.timer) clearTimeout(match.timer);

  gameStateService.updateMatch(matchId, {
    timer: null,
    turnDeadlineAt: null,
  });
}

function startTimer(io, matchId) {
  clearTurnTimer(matchId);

  const match = gameStateService.getMatch(matchId);
  if (!match || !match.gameState) return;

  const turnDeadlineAt = Date.now() + TURN_TIMEOUT_MS;
  const timer = setTimeout(async () => {
    const current = gameStateService.getMatch(matchId);
    if (!current) return;
    const winner = current.gameState.currentSymbol === 'X' ? current.playerO : current.playerX;
    await endMatch(io, matchId, winner.userId, 'timeout');
  }, TURN_TIMEOUT_MS);

  gameStateService.updateMatch(matchId, {
    timer,
    turnDeadlineAt,
  });
}

function startReconnectTimer(io, matchId, disconnectedUserId) {
  const match = gameStateService.getMatch(matchId);
  if (!match) return;

  const reconnectTimers = { ...(match.reconnectTimers || {}) };
  const reconnectDeadlines = { ...(match.reconnectDeadlines || {}) };

  if (reconnectTimers[disconnectedUserId]) {
    clearTimeout(reconnectTimers[disconnectedUserId]);
  }

  reconnectDeadlines[disconnectedUserId] = Date.now() + TURN_TIMEOUT_MS;

  const reconnectTimer = setTimeout(async () => {
    const current = gameStateService.getMatch(matchId);
    if (!current) return;
    const winner = current.playerX.userId === disconnectedUserId ? current.playerO : current.playerX;
    await endMatch(io, matchId, winner.userId, 'abandon');
  }, TURN_TIMEOUT_MS);

  reconnectTimers[disconnectedUserId] = reconnectTimer;

  gameStateService.updateMatch(matchId, {
    reconnectTimers,
    reconnectDeadlines,
  });
}

async function maybeStartMatch(io, matchId) {
  const match = gameStateService.getMatch(matchId);
  if (!match || match.gameState || match.connectedPlayers.size < 2) return;

  const startedAt = new Date();

  await prisma.match.update({
    where: { id: matchId },
    data: {
      status: 'active',
      startedAt,
    },
  });

  gameStateService.updateMatch(matchId, {
    gameState: getMatchEngine(match).init(),
    startedAt,
  });

  startTimer(io, matchId);
}

async function endMatch(io, matchId, winnerId, reason) {
  const match = gameStateService.getMatch(matchId);
  if (!match) return;

  clearTurnTimer(matchId);

  Object.values(match.reconnectTimers || {}).forEach((timer) => clearTimeout(timer));

  const durationSeconds = match.startedAt
    ? Math.max(0, Math.floor((Date.now() - match.startedAt.getTime()) / 1000))
    : null;
  const { ratingDeltaX, ratingDeltaO } = await applyMatchRatingResult(matchId, match, winnerId, reason);

  await prisma.match.update({
    where: { id: matchId },
    data: {
      status: 'finished',
      winnerId: winnerId || null,
      resultType: reason,
      finishedAt: new Date(),
      durationSeconds,
      ratingDeltaX,
      ratingDeltaO,
    },
  });

  io.to(`match:${matchId}`).emit('game:ended', {
    winnerId,
    reason,
    board: match.gameState?.board,
  });

  gameStateService.deleteMatch(matchId);
}

async function saveMoveToDb(matchId, playerId, symbol, position, moveNumber) {
  const x = Math.floor(position / 3);
  const y = position % 3;
  await prisma.matchMove.create({
    data: { matchId, moveNumber, playerId, symbol, positionX: x, positionY: y },
  }).catch(() => {});
}

function registerGameHandlers(socket, io) {
  const { id: userId } = socket.user;

  socket.on('game:join', async ({ matchId }) => {
    const match = gameStateService.getMatch(matchId);
    if (!match) return socket.emit('game:error', { code: 'MATCH_NOT_FOUND' });

    const isPlayer = match.playerX.userId === userId || match.playerO.userId === userId;
    if (!isPlayer) return socket.emit('game:error', { code: 'NOT_A_PLAYER' });

    socket.join(`match:${matchId}`);

    const connected = new Set(match.connectedPlayers);
    connected.add(userId);
    const disconnected = new Set(match.disconnectedPlayers);
    const wasDisconnected = disconnected.delete(userId);
    const reconnectTimers = { ...(match.reconnectTimers || {}) };
    const reconnectDeadlines = { ...(match.reconnectDeadlines || {}) };

    if (reconnectTimers[userId]) {
      clearTimeout(reconnectTimers[userId]);
      delete reconnectTimers[userId];
    }

    delete reconnectDeadlines[userId];

    gameStateService.updateMatch(matchId, {
      connectedPlayers: connected,
      disconnectedPlayers: disconnected,
      reconnectTimers,
      reconnectDeadlines,
    });

    if (wasDisconnected) {
      socket.to(`match:${matchId}`).emit('game:opponent-reconnected', { userId });
    }

    await maybeStartMatch(io, matchId);

    const updatedMatch = gameStateService.getMatch(matchId);
    if (!updatedMatch?.gameState) return;

    emitChatHistory(socket, updatedMatch);
    emitMatchState(io, matchId, updatedMatch);
    emitTimerUpdate(socket, matchId, updatedMatch);
  });

  socket.on('game:move', async ({ matchId, position }) => {
    const match = gameStateService.getMatch(matchId);
    if (!match) return socket.emit('game:error', { code: 'MATCH_NOT_FOUND' });
    if (!match.gameState) return socket.emit('game:error', { code: 'GAME_NOT_STARTED' });

    const isX = match.playerX.userId === userId;
    const isO = match.playerO.userId === userId;
    if (!isX && !isO) return socket.emit('game:error', { code: 'NOT_A_PLAYER' });

    const playerSymbol = isX ? 'X' : 'O';
    const engine = getMatchEngine(match);

    if (match.gameState.currentSymbol !== playerSymbol) {
      return socket.emit('game:error', { code: 'NOT_YOUR_TURN' });
    }
    if (!engine.validateMove(match.gameState, position)) {
      return socket.emit('game:error', { code: 'INVALID_MOVE' });
    }

    const newState = engine.applyMove(match.gameState, position, playerSymbol);
    gameStateService.updateMatch(matchId, { gameState: newState });
    await saveMoveToDb(matchId, userId, playerSymbol, position, newState.moveCount);

    const winResult = engine.checkWinner(newState.board);
    if (winResult) {
      const winnerId = winResult.winner === 'X' ? match.playerX.userId : match.playerO.userId;
      clearTurnTimer(matchId);
      io.to(`match:${matchId}`).emit('game:state', {
        ...serializeMatchState({
          ...match,
          gameState: newState,
          turnDeadlineAt: null,
        }),
        turnDeadlineAt: null,
        winLine: winResult.line,
      });
      return await endMatch(io, matchId, winnerId, 'win');
    }

    if (engine.checkDraw(newState.board)) {
      clearTurnTimer(matchId);
      emitMatchState(io, matchId, gameStateService.getMatch(matchId));
      return await endMatch(io, matchId, null, 'draw');
    }

    startTimer(io, matchId);

    const updatedMatch = gameStateService.getMatch(matchId);
    emitMatchState(io, matchId, updatedMatch);
    emitTimerUpdate(io.to(`match:${matchId}`), matchId, updatedMatch);
  });

  socket.on('game:chat-send', ({ matchId, text }) => {
    const match = gameStateService.getMatch(matchId);
    if (!match) return socket.emit('game:error', { code: 'MATCH_NOT_FOUND' });

    const isPlayer = match.playerX.userId === userId || match.playerO.userId === userId;
    if (!isPlayer) return socket.emit('game:error', { code: 'NOT_A_PLAYER' });

    const normalizedText = sanitizeChatText(text);
    if (!normalizedText) return;

    const lastSentAt = match.chatLastSentAt?.[userId] || 0;
    if (Date.now() - lastSentAt < CHAT_RATE_LIMIT_MS) {
      return socket.emit('game:error', { code: 'CHAT_RATE_LIMIT' });
    }

    const message = {
      id: `${Date.now()}-${userId}`,
      userId,
      username: socket.user.username,
      text: normalizedText,
      createdAt: new Date().toISOString(),
    };

    const chatMessages = [...(match.chatMessages || []), message].slice(-50);
    const chatLastSentAt = {
      ...(match.chatLastSentAt || {}),
      [userId]: Date.now(),
    };

    gameStateService.updateMatch(matchId, {
      chatMessages,
      chatLastSentAt,
    });

    io.to(`match:${matchId}`).emit('game:chat-message', message);
  });

  socket.on('disconnect', () => {
    const active = gameStateService.getActiveMatchForUser(userId);
    if (!active) return;

    const { matchId, match } = active;
    if (!match) return;

    const connected = new Set(match.connectedPlayers);
    connected.delete(userId);
    const disconnected = new Set(match.disconnectedPlayers);
    disconnected.add(userId);

    gameStateService.updateMatch(matchId, {
      connectedPlayers: connected,
      disconnectedPlayers: disconnected,
    });

    io.to(`match:${matchId}`).emit('game:opponent-disconnected', { userId });

    startReconnectTimer(io, matchId, userId);
  });
}

module.exports = { registerGameHandlers };
