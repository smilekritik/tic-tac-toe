const prisma = require('../../lib/prisma');

const queue = new Map();

function addToQueue(userId, username, socketId, gameMode) {
  queue.set(userId, {
    userId,
    username,
    socketId,
    gameMode,
    joinedAt: Date.now(),
  });
}

function removeFromQueue(userId) {
  queue.delete(userId);
}

function isInQueue(userId) {
  return queue.has(userId);
}

async function tryMatch(currentUserId) {
  const currentPlayer = queue.get(currentUserId);
  if (!currentPlayer) return null;

  for (const [candidateId, candidate] of queue.entries()) {
    if (candidateId === currentUserId) continue;
    if (candidate.gameMode?.code !== currentPlayer.gameMode?.code) continue;

    const player1 = currentPlayer;
    const player2 = candidate;

    removeFromQueue(currentUserId);
    removeFromQueue(candidateId);

    const match = await prisma.match.create({
      data: {
        gameModeId: player1.gameMode.id,
        matchType: 'ranked',
        playerXId: player1.userId,
        playerOId: player2.userId,
        status: 'waiting',
      },
    });

    return { match, player1, player2, gameMode: player1.gameMode };
  }

  return null;
}

module.exports = { addToQueue, removeFromQueue, isInQueue, tryMatch };
