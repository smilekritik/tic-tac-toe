const prisma = require('../../lib/prisma');

const queue = new Map();

function addToQueue(userId, username, socketId) {
  queue.set(userId, { userId, username, socketId, joinedAt: Date.now() });
}

function removeFromQueue(userId) {
  queue.delete(userId);
}

function isInQueue(userId) {
  return queue.has(userId);
}

async function tryMatch(currentUserId) {
  for (const [candidateId, candidate] of queue.entries()) {
    if (candidateId === currentUserId) continue;

    const player1 = queue.get(currentUserId);
    const player2 = candidate;

    removeFromQueue(currentUserId);
    removeFromQueue(candidateId);

    const gameMode = await prisma.gameMode.findUnique({
      where: { code: 'classic' },
    });

    const match = await prisma.match.create({
      data: {
        gameModeId: gameMode.id,
        matchType: 'ranked',
        playerXId: player1.userId,
        playerOId: player2.userId,
        status: 'waiting',
      },
    });

    return { match, player1, player2 };
  }

  return null;
}

module.exports = { addToQueue, removeFromQueue, isInQueue, tryMatch };
