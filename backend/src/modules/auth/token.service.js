const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../../config/env');

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    env.jwt.secret,
    { expiresIn: env.jwt.accessExpiration }
  );
}

function generateRefreshToken() {
  const token = crypto.randomBytes(40).toString('hex');
  const hash = hashToken(token);
  const expirationMs = parseRefreshExpiration(env.jwt.refreshExpiration);
  const expiresAt = new Date(Date.now() + expirationMs);
  return { token, hash, expiresAt };
}

function parseRefreshExpiration(expiration) {
  const match = expiration.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
  const value = parseInt(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return value * (multipliers[unit] || 1000);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.secret);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  parseRefreshExpiration,
  hashToken,
  verifyAccessToken,
};
