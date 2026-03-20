const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const fs = require('fs/promises');
const path = require('path');
const prisma = require('../../lib/prisma');
const mailService = require('../mail/mail.service');
const env = require('../../config/env');
const { enforceBusinessRateLimit } = require('../../lib/businessRateLimit');

const UPLOAD_PUBLIC_PREFIX = '/uploads/';
const MANAGED_UPLOAD_RE = /^[a-f0-9]{32}\.(jpg|png|webp)$/;
const UPLOAD_DIR = path.resolve(process.cwd(), env.upload.path);

function createError(code, status) {
  const err = new Error(code);
  err.code = code;
  err.status = status;
  return err;
}

function resolveManagedUploadPath(publicPath) {
  if (typeof publicPath !== 'string' || !publicPath.startsWith(UPLOAD_PUBLIC_PREFIX)) {
    return null;
  }

  const filename = publicPath.slice(UPLOAD_PUBLIC_PREFIX.length);
  if (!MANAGED_UPLOAD_RE.test(filename)) {
    return null;
  }

  const absolutePath = path.resolve(UPLOAD_DIR, filename);
  const relativePath = path.relative(UPLOAD_DIR, absolutePath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }

  return absolutePath;
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

async function getMe(userId) {
  const [user, gameModes] = await Promise.all([
    prisma.user.findUnique({
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
        ratings: {
          select: {
            eloRating: true,
            gamesPlayed: true,
            wins: true,
            losses: true,
            draws: true,
            winStreak: true,
            maxWinStreak: true,
            gameMode: {
              select: {
                code: true,
                name: true,
              },
            },
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

  return {
    ...user,
    ratings: hydrateRatings(gameModes, user.ratings),
  };
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
  const existing = await prisma.user.findFirst({
    where: { username: { equals: username, mode: 'insensitive' } },
    select: { id: true },
  });
  if (existing) throw createError('USERNAME_TAKEN', 409);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { username },
    select: { id: true, username: true },
  });
  return user;
}

async function requestEmailChange(userId, newEmail) {
  // Business limit: not more than 1 email-change confirmation per 60s.
  enforceBusinessRateLimit({ key: `emailChange:user:${userId}`, minIntervalMs: 60 * 1000 });

  const existing = await prisma.user.findFirst({
    where: { email: { equals: newEmail, mode: 'insensitive' } },
    select: { id: true },
  });
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
  await mailService.sendEmailChangeConfirmation(
    newEmail,
    record.token,
    lang,
    { userId },
  ).catch(() => {});

  return { message: 'Confirmation email sent' };
}

async function uploadAvatar(userId, filePath) {
  // Business limit: not more than 5 avatar changes per 10 minutes.
  enforceBusinessRateLimit({ key: `avatar:user:${userId}`, maxInWindow: 5, windowMs: 10 * 60 * 1000 });

  const nextAvatarAbsolutePath = resolveManagedUploadPath(filePath);
  if (!nextAvatarAbsolutePath) {
    throw createError('INVALID_FILE_TYPE', 400);
  }

  const currentProfile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { avatarPath: true },
  });

  try {
    const profile = await prisma.userProfile.update({
      where: { userId },
      data: { avatarPath: filePath },
    });

    const previousAvatarAbsolutePath = resolveManagedUploadPath(currentProfile?.avatarPath);
    if (
      previousAvatarAbsolutePath &&
      previousAvatarAbsolutePath !== nextAvatarAbsolutePath
    ) {
      await fs.unlink(previousAvatarAbsolutePath).catch((err) => {
        if (err?.code !== 'ENOENT') {
          throw err;
        }
      });
    }

    return { avatarPath: profile.avatarPath };
  } catch (err) {
    await fs.unlink(nextAvatarAbsolutePath).catch(() => {});
    throw err;
  }
}

module.exports = { getMe, updateProfile, updateUsername, requestEmailChange, uploadAvatar };
