const matchmakingService = require('./matchmaking.service');
const gameStateService = require('../game/game.state');
const meService = require('../me/me.service');
const prisma = require('../../lib/prisma');

function hasReconnectWindow(match, userId) {
  const deadline = match?.reconnectDeadlines?.[userId];
  return Boolean(deadline && deadline > Date.now());
}

function registerMatchmakingHandlers(socket, io) {
  const { id: userId, username } = socket.user;

  socket.on('matchmaking:join', async () => {
    if (matchmakingService.isInQueue(userId)) return;

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

    matchmakingService.addToQueue(userId, username, socket.id);
    socket.emit('matchmaking:queued');

    const result = await matchmakingService.tryMatch(userId);
    if (!result) return;

    const { match, player1, player2 } = result;

    gameStateService.createMatch(match.id, player1, player2);

    const payload = (symbol, opponent) => ({ matchId: match.id, symbol, opponent });

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
