async function deleteUsersWithRelations(tx, userIds) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return;
  }

  await tx.adminLog.deleteMany({
    where: {
      OR: [
        { adminUserId: { in: userIds } },
        { targetUserId: { in: userIds } },
      ],
    },
  });

  await tx.matchMove.deleteMany({
    where: {
      playerId: { in: userIds },
    },
  });

  await tx.match.deleteMany({
    where: {
      OR: [
        { playerXId: { in: userIds } },
        { playerOId: { in: userIds } },
        { winnerId: { in: userIds } },
      ],
    },
  });

  await tx.userBan.deleteMany({
    where: {
      OR: [
        { userId: { in: userIds } },
        { bannedBy: { in: userIds } },
      ],
    },
  });

  await tx.userRating.deleteMany({
    where: { userId: { in: userIds } },
  });

  await tx.invite.deleteMany({
    where: { createdBy: { in: userIds } },
  });

  await tx.refreshToken.deleteMany({
    where: { userId: { in: userIds } },
  });

  await tx.emailVerificationToken.deleteMany({
    where: { userId: { in: userIds } },
  });

  await tx.passwordResetToken.deleteMany({
    where: { userId: { in: userIds } },
  });

  await tx.userEmailChange.deleteMany({
    where: { userId: { in: userIds } },
  });

  await tx.userLoginHistory.deleteMany({
    where: { userId: { in: userIds } },
  });

  await tx.userProfile.deleteMany({
    where: { userId: { in: userIds } },
  });

  await tx.user.deleteMany({
    where: { id: { in: userIds } },
  });
}

module.exports = { deleteUsersWithRelations };
