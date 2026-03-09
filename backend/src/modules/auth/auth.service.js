const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../../lib/prisma');
const tokenService = require('./token.service');
const env = require('../../config/env');

async function register({ email, username, password }) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    const field = existing.email === email ? 'email' : 'username';
    const err = new Error(`This ${field} is already taken`);
    err.status = 409;
    throw err;
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

  return { user, verifyToken: verifyToken.token };
}

async function login({ login, password, ip, userAgent }) {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: login }, { username: login }] },
  });

  const success = !!user && (await bcrypt.compare(password, user.passwordHash));

  if (user) {
    await prisma.userLoginHistory.create({
      data: { userId: user.id, ipAddress: ip, userAgent, success },
    }).catch(() => {});
  }

  if (!user || !success) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
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
    const err = new Error('Invalid refresh token');
    err.status = 401;
    throw err;
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

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    const err = new Error('Invalid or expired token');
    err.status = 400;
    throw err;
  }

  await prisma.emailVerificationToken.update({
    where: { token },
    data: { usedAt: new Date() },
  });

  await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerified: true },
  });
}

async function forgotPassword(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

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

  return { user, resetToken: record.token };
}

async function resetPassword(token, newPassword) {
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    const err = new Error('Invalid or expired token');
    err.status = 400;
    throw err;
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

module.exports = { register, login, refresh, logout, verifyEmail, forgotPassword, resetPassword };
