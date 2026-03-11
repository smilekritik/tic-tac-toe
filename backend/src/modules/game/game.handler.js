const gameStateService = require('./game.state');
const { createEngine } = require('./engine/game.engine');
const classicMode = require('./engine/classic.mode');
const prisma = require('../../lib/prisma');

const engine = createEngine(classicMode);
const TURN_TIMEOUT_MS = 30000;

function emitMatchState(io, matchId, match) {
  io.to(`match:${matchId}`).emit('game:state', {
    board: match.gameState.board,
    currentSymbol: match.gameState.currentSymbol,
    moveCount: match.gameState.moveCount,
    playerX: match.playerX.username,
    playerO: match.playerO.username,
  });
}

function startTimer(io, matchId) {
  const match = gameStateService.getMatch(matchId);
  if (!match) return;
  if (match.timer) clearTimeout(match.timer);
  const timer = setTimeout(async () => {
    const current = gameStateService.getMatch(matchId);
    if (!current) return;
    const winner = current.gameState.currentSymbol === 'X' ? current.playerO : current.playerX;
    await endMatch(io, matchId, winner.userId, 'timeout');
  }, TURN_TIMEOUT_MS);
  gameStateService.updateMatch(matchId, { timer });
}

function startReconnectTimer(io, matchId, disconnectedUserId) {
  const match = gameStateService.getMatch(matchId);
  if (!match) return;

  const timerKey = `reconnectTimer_${disconnectedUserId}`;
  if (match[timerKey]) clearTimeout(match[timerKey]);

  const reconnectTimer = setTimeout(async () => {
    const current = gameStateService.getMatch(matchId);
    if (!current) return;
    // Player didn't reconnect in time — forfeit
    const winner = current.playerX.userId === disconnectedUserId ? current.playerO : current.playerX;
    await endMatch(io, matchId, winner.userId, 'abandon');
  }, RECONNECT_TIMEOUT_MS);

  gameStateService.updateMatch(matchId, { [timerKey]: reconnectTimer });
}

async function endMatch(io, matchId, winnerId, reason) {
  const match = gameStateService.getMatch(matchId);
  if (!match) return;
  if (match.timer) clearTimeout(match.timer);

  await prisma.match.update({
    where: { id: matchId },
    data: {
      status: 'finished',
      winnerId: winnerId || null,
      resultType: reason,
      finishedAt: new Date(),
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

  // Handle reconnection to active match
  socket.on('game:join', async ({ matchId }) => {
    const match = gameStateService.getMatch(matchId);
    if (!match) return socket.emit('game:error', { code: 'MATCH_NOT_FOUND' });

    const isPlayer = match.playerX.userId === userId || match.playerO.userId === userId;
    if (!isPlayer) return socket.emit('game:error', { code: 'NOT_A_PLAYER' });

    socket.join(`match:${matchId}`);

    const connected = new Set(match.connectedPlayers);
    connected.add(userId);
    const disconnected = new Set(match.disconnectedPlayers);
    disconnected.delete(userId);

    // Clear reconnect timer if exists
    const timerKey = `reconnectTimer_${userId}`;
    if (match[timerKey]) {
      clearTimeout(match[timerKey]);
    }

    gameStateService.updateMatch(matchId, {
      connectedPlayers: connected,
      disconnectedPlayers: disconnected,
      [timerKey]: null,
    });

    const wasDisconnected = match.disconnectedPlayers?.has(userId);

    if (!gameStateService.getMatch(matchId).gameState) {
      gameStateService.updateMatch(matchId, { gameState: engine.init() });
      startTimer(io, matchId);
    } else if (wasDisconnected) {
      // Notify opponent about reconnection
      socket.to(`match:${matchId}`).emit('game:opponent-reconnected', { userId });
    }

    emitMatchState(io, matchId, gameStateService.getMatch(matchId));
  });

  socket.on('game:move', async ({ matchId, position }) => {
    const match = gameStateService.getMatch(matchId);
    if (!match) return socket.emit('game:error', { code: 'MATCH_NOT_FOUND' });

    const isX = match.playerX.userId === userId;
    const isO = match.playerO.userId === userId;
    if (!isX && !isO) return socket.emit('game:error', { code: 'NOT_A_PLAYER' });

    const playerSymbol = isX ? 'X' : 'O';
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
      io.to(`match:${matchId}`).emit('game:state', {
        board: newState.board,
        currentSymbol: newState.currentSymbol,
        moveCount: newState.moveCount,
        playerX: match.playerX.username,
        playerO: match.playerO.username,
        winLine: winResult.line,
      });
      return await endMatch(io, matchId, winnerId, 'win');
    }

    if (engine.checkDraw(newState.board)) {
      emitMatchState(io, matchId, gameStateService.getMatch(matchId));
      return await endMatch(io, matchId, null, 'draw');
    }

    emitMatchState(io, matchId, gameStateService.getMatch(matchId));
    startTimer(io, matchId);
  });

  // Handle disconnect
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

    // Notify opponent
    io.to(`match:${matchId}`).emit('game:opponent-disconnected', { userId });

    // Start reconnect countdown
    startReconnectTimer(io, matchId, userId);
  });
}

module.exports = { registerGameHandlers };
