const prisma = require('../../lib/prisma');

function createError(code, status) {
  const err = new Error(code);
  err.code = code;
  err.status = status;
  return err;
}

async function getPublicProfile(username) {
  const user = await prisma.user.findUnique({
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
          gameMode: { select: { code: true, name: true } },
        },
      },
    },
  });

  if (!user) throw createError('USER_NOT_FOUND', 404);
  if (!user.profile?.publicProfileEnabled) throw createError('PROFILE_PRIVATE', 403);

  return user;
}

module.exports = { getPublicProfile };
