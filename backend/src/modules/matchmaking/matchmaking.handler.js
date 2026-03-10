const matchmakingService = require('./matchmaking.service');
const gameStateService = require('../game/game.state');

function registerMatchmakingHandlers(socket, io) {
  const { id: userId, username } = socket.user;

  socket.on('matchmaking:join', async () => {
    if (matchmakingService.isInQueue(userId)) return;

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
