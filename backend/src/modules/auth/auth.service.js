const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../../lib/prisma');
const tokenService = require('./token.service');
const mailService = require('../mail/mail.service');
const env = require('../../config/env');
const { enforceBusinessRateLimit } = require('../../lib/businessRateLimit');

function createError(code, status) {
  const err = new Error(code);
  err.code = code;
  err.status = status;
  return err;
}

async function register({ email, username, password, lang = 'en' }) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: email, mode: 'insensitive' } },
        { username: { equals: username, mode: 'insensitive' } },
      ],
    },
  });
  if (existing) {
    const emailTaken = existing.email?.toLowerCase?.() === email?.toLowerCase?.();
    const code = emailTaken ? 'EMAIL_TAKEN' : 'USERNAME_TAKEN';
    throw createError(code, 409);
  }

  const passwordHash = await bcrypt.hash(password, env.security.bcryptRounds);

  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      profile: { create: {} },
    },
  });

  const verifyToken = await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      token: crypto.randomBytes(32).toString('hex'),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await mailService.sendVerificationEmail(user.email, verifyToken.token, lang).catch(() => {});
  return { user, verifyToken: verifyToken.token };
}

async function login({ login, password, ip, userAgent }) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: login, mode: 'insensitive' } },
        { username: { equals: login, mode: 'insensitive' } },
      ],
    },
  });

  const success = !!user && (await bcrypt.compare(password, user.passwordHash));

  if (user) {
    await prisma.userLoginHistory.create({
      data: { userId: user.id, ipAddress: ip, userAgent, success },
    }).catch(() => {});
  }

  if (!user || !success) {
    throw createError('INVALID_CREDENTIALS', 401);
  }

  const accessToken = tokenService.generateAccessToken(user);
  const { token: refreshToken, hash, expiresAt } = tokenService.generateRefreshToken();

  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hash, expiresAt, ipAddress: ip, userAgent },
  });

  return { user, accessToken, refreshToken };
}

async function refresh(refreshToken) {
  const hash = tokenService.hashToken(refreshToken);
  const stored = await prisma.refreshToken.findFirst({
    where: { tokenHash: hash, revokedAt: null },
  });

  if (!stored || stored.expiresAt < new Date()) {
    throw createError('TOKEN_INVALID', 401);
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  const accessToken = tokenService.generateAccessToken(user);

  return { accessToken };
}

async function logout(refreshToken) {
  const hash = tokenService.hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hash },
    data: { revokedAt: new Date() },
  });
}

async function verifyEmail(token) {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
  });

  if (!record) {
    throw createError('TOKEN_INVALID', 400);
  }

  if (record.expiresAt < new Date()) {
    throw createError('TOKEN_INVALID', 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: record.userId },
  });

  if (record.usedAt) {
    if (user?.emailVerified) {
      return { message: 'Email already verified' };
    }
    throw createError('TOKEN_INVALID', 400);
  }

  await prisma.emailVerificationToken.update({
    where: { token },
    data: { usedAt: new Date() },
  });

  await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerified: true },
  });

  return { message: 'Email verified' };
}

async function forgotPassword(email) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });
  if (!user) return;

  enforceBusinessRateLimit({ key: `pwdReset:user:${user.id}:cooldown`, minIntervalMs: 60 * 1000 });
  enforceBusinessRateLimit({ key: `pwdReset:user:${user.id}:burst`, maxInWindow: 3, windowMs: 10 * 60 * 1000 });

  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const record = await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token: crypto.randomBytes(32).toString('hex'),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const lang = user.profile?.preferredLanguage || 'en';
  await mailService.sendPasswordResetEmail(user.email, record.token, lang).catch(() => {});
  return { user, resetToken: record.token };
}

async function resetPassword(token, newPassword) {
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw createError('TOKEN_EXPIRED', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, env.security.bcryptRounds);

  await prisma.user.update({
    where: { id: record.userId },
    data: { passwordHash },
  });

  await prisma.passwordResetToken.update({
    where: { token },
    data: { usedAt: new Date() },
  });
}

async function resendVerification(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user) {
    throw createError('USER_NOT_FOUND', 404);
  }

  if (user.emailVerified) {
    throw createError('EMAIL_ALREADY_VERIFIED', 400);
  }

  // Business limit: not more than 1 verification email per 60s.
  enforceBusinessRateLimit({ key: `verifyEmail:user:${user.id}`, minIntervalMs: 60 * 1000 });

  await prisma.emailVerificationToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const verifyToken = await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      token: crypto.randomBytes(32).toString('hex'),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const lang = user.profile?.preferredLanguage || 'en';
  await mailService.sendVerificationEmail(user.email, verifyToken.token, lang).catch(() => {});

  return { message: 'Verification email sent' };
}

module.exports = { register, login, refresh, logout, verifyEmail, forgotPassword, resetPassword, resendVerification };
