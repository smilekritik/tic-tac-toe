const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../../lib/prisma');
const mailService = require('../mail/mail.service');
const env = require('../../config/env');

function createError(code, status) {
  const err = new Error(code);
  err.code = code;
  err.status = status;
  return err;
}

async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      emailVerified: true,
      role: true,
      createdAt: true,
      profile: {
        select: {
          avatarPath: true,
          preferredLanguage: true,
          chatEnabledDefault: true,
          publicProfileEnabled: true,
        },
      },
    },
  });

  if (!user) throw createError('USER_NOT_FOUND', 404);
  return user;
}

async function updateProfile(userId, { preferredLanguage, chatEnabledDefault, publicProfileEnabled }) {
  const profile = await prisma.userProfile.update({
    where: { userId },
    data: {
      ...(preferredLanguage !== undefined && { preferredLanguage }),
      ...(chatEnabledDefault !== undefined && { chatEnabledDefault }),
      ...(publicProfileEnabled !== undefined && { publicProfileEnabled }),
    },
  });
  return profile;
}

async function updateUsername(userId, username) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw createError('USERNAME_TAKEN', 409);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { username },
    select: { id: true, username: true },
  });
  return user;
}

async function requestEmailChange(userId, newEmail) {
  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing) throw createError('EMAIL_TAKEN', 409);

  await prisma.userEmailChange.updateMany({
    where: { userId, confirmedAt: null },
    data: { confirmedAt: new Date() },
  });

  const record = await prisma.userEmailChange.create({
    data: {
      userId,
      newEmail,
      token: crypto.randomBytes(32).toString('hex'),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  const lang = user.profile?.preferredLanguage || 'en';
  await mailService.sendEmailChangeConfirmation(newEmail, record.token, lang).catch(() => {});

  return { message: 'Confirmation email sent' };
}

async function uploadAvatar(userId, filePath) {
  const profile = await prisma.userProfile.update({
    where: { userId },
    data: { avatarPath: filePath },
  });
  return { avatarPath: profile.avatarPath };
}

module.exports = { getMe, updateProfile, updateUsername, requestEmailChange, uploadAvatar };
