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
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return { token, hash, expiresAt };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.secret);
}

module.exports = { generateAccessToken, generateRefreshToken, hashToken, verifyAccessToken };
