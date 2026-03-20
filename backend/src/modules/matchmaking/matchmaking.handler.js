const matchmakingService = require('./matchmaking.service');
const gameStateService = require('../game/game.state');
const { isSupportedMode } = require('../game/engine/game-modes');
const meService = require('../me/me.service');
const prisma = require('../../lib/prisma');

function hasReconnectWindow(match, userId) {
  const deadline = match?.reconnectDeadlines?.[userId];
  return Boolean(deadline && deadline > Date.now());
}

function registerMatchmakingHandlers(socket, io) {
  const { id: userId, username } = socket.user;

  socket.on('matchmaking:join', async ({ modeCode } = {}) => {
    if (matchmakingService.isInQueue(userId)) return;

    const requestedModeCode = typeof modeCode === 'string' ? modeCode : 'classic';
    if (!isSupportedMode(requestedModeCode)) {
      return socket.emit('matchmaking:error', { code: 'INVALID_GAME_MODE' });
    }

    const activeMatch = gameStateService.getActiveMatchForUser(userId);
    if (activeMatch?.match) {
      const code = hasReconnectWindow(activeMatch.match, userId)
        ? 'RECONNECT_WINDOW_ACTIVE'
        : 'ACTIVE_MATCH_EXISTS';

      return socket.emit('matchmaking:error', {
        code,
        matchId: activeMatch.matchId,
      });
    }

    const activeBan = await prisma.userBan.findFirst({
      where: {
        userId,
        active: true,
        startsAt: { lte: new Date() },
        endsAt: { gt: new Date() },
      },
      select: {
        reason: true,
        endsAt: true,
      },
    });

    if (activeBan) {
      return socket.emit('matchmaking:error', {
        code: 'GAME_BANNED',
        reason: activeBan.reason,
        endsAt: activeBan.endsAt,
      });
    }

    try {
      const me = await meService.getMe(userId);
      if (!me.emailVerified) {
        return socket.emit('matchmaking:error', { code: 'EMAIL_NOT_VERIFIED' });
      }
    } catch (e) {
      return socket.emit('matchmaking:error', { code: 'USER_NOT_ELIGIBLE' });
    }

    const gameMode = await prisma.gameMode.findUnique({
      where: { code: requestedModeCode },
      select: {
        id: true,
        code: true,
        name: true,
        isRanked: true,
        isEnabled: true,
      },
    });

    if (!gameMode || !gameMode.isEnabled) {
      return socket.emit('matchmaking:error', { code: 'INVALID_GAME_MODE' });
    }

    matchmakingService.addToQueue(userId, username, socket.id, gameMode);
    socket.emit('matchmaking:queued');

    const result = await matchmakingService.tryMatch(userId);
    if (!result) return;

    const { match, player1, player2 } = result;

    gameStateService.createMatch(match.id, player1, player2, result.gameMode);

    const payload = (symbol, opponent) => ({
      matchId: match.id,
      symbol,
      opponent,
      gameMode: result.gameMode,
    });

    io.to(`user:${player1.userId}`).emit('matchmaking:matched', payload('X', player2.username));
    io.to(`user:${player2.userId}`).emit('matchmaking:matched', payload('O', player1.username));
  });

  socket.on('matchmaking:leave', () => {
    matchmakingService.removeFromQueue(userId);
    socket.emit('matchmaking:left');
  });

  socket.on('disconnect', () => {
    matchmakingService.removeFromQueue(userId);
  });
}

module.exports = { registerMatchmakingHandlers };
