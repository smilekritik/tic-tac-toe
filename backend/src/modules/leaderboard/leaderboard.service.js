const prisma = require('../../lib/prisma');

async function getLeaderboard({ viewerUserId, gameModeCode }) {
  const categories = await prisma.gameMode.findMany({
    where: {
      isEnabled: true,
      isRanked: true,
    },
    select: {
      id: true,
      code: true,
      name: true,
    },
    orderBy: { name: 'asc' },
  });

  if (!categories.length) {
    return {
      categories: [],
      mode: null,
      entries: [],
    };
  }

  const selectedMode = categories.find((category) => category.code === gameModeCode) || categories[0];

  const ratings = await prisma.userRating.findMany({
    where: {
      gameModeId: selectedMode.id,
      OR: [
        { userId: viewerUserId },
        {
          user: {
            profile: {
              is: {
                publicProfileEnabled: true,
              },
            },
          },
        },
      ],
    },
    select: {
      userId: true,
      eloRating: true,
      gamesPlayed: true,
      wins: true,
      losses: true,
      draws: true,
      winStreak: true,
      maxWinStreak: true,
      updatedAt: true,
      user: {
        select: {
          username: true,
          profile: {
            select: {
              avatarPath: true,
            },
          },
        },
      },
    },
    orderBy: [
      { eloRating: 'desc' },
      { gamesPlayed: 'desc' },
      { updatedAt: 'asc' },
      { userId: 'asc' },
    ],
    take: 100,
  });

  return {
    categories: categories.map((category) => ({
      code: category.code,
      name: category.name,
    })),
    mode: {
      code: selectedMode.code,
      name: selectedMode.name,
    },
    entries: ratings.map((rating, index) => ({
      rank: index + 1,
      isCurrentUser: rating.userId === viewerUserId,
      username: rating.user.username,
      avatarPath: rating.user.profile?.avatarPath || null,
      eloRating: rating.eloRating,
      gamesPlayed: rating.gamesPlayed,
      wins: rating.wins,
      losses: rating.losses,
      draws: rating.draws,
      winStreak: rating.winStreak,
      maxWinStreak: rating.maxWinStreak,
    })),
  };
}

module.exports = { getLeaderboard };
