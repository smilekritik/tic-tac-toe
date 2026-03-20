const prisma = require('../../lib/prisma');

function createError(code, status) {
  const err = new Error(code);
  err.code = code;
  err.status = status;
  return err;
}

function hydrateRatings(gameModes, ratings = []) {
  const ratingByMode = new Map(ratings.map((rating) => [rating.gameMode.code, rating]));

  return gameModes.map((gameMode) => {
    const existingRating = ratingByMode.get(gameMode.code);
    if (existingRating) return existingRating;

    return {
      eloRating: 1000,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      winStreak: 0,
      maxWinStreak: 0,
      gameMode: {
        code: gameMode.code,
        name: gameMode.name,
      },
    };
  });
}

async function getPublicProfile(username) {
  const [user, gameModes] = await Promise.all([
    prisma.user.findUnique({
      where: { username },
      select: {
        username: true,
        createdAt: true,
        profile: {
          select: {
            avatarPath: true,
            publicProfileEnabled: true,
          },
        },
        ratings: {
          select: {
            eloRating: true,
            gamesPlayed: true,
            wins: true,
            losses: true,
            draws: true,
            winStreak: true,
            maxWinStreak: true,
            gameMode: { select: { code: true, name: true } },
          },
        },
      },
    }),
    prisma.gameMode.findMany({
      where: {
        isEnabled: true,
        isRanked: true,
      },
      select: {
        code: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!user) throw createError('USER_NOT_FOUND', 404);
  if (!user.profile?.publicProfileEnabled) throw createError('PROFILE_PRIVATE', 403);

  return {
    ...user,
    ratings: hydrateRatings(gameModes, user.ratings),
  };
}

module.exports = { getPublicProfile };
