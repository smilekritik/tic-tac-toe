const authService = require('./auth.service');
const mailService = require('../mail/mail.service');

const REFRESH_COOKIE = 'refreshToken';
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

async function register(req, res, next) {
  try {
    const { email, username, password } = req.body;
    const lang = req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'en';
    const supported = ['en', 'uk', 'pl'];
    const safeLang = supported.includes(lang) ? lang : 'en';
    await authService.register({ email, username, password, lang: safeLang });
    res.status(201).json({ message: 'Registered. Check your email to verify your account.' });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { login, password } = req.body;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const { user, accessToken, refreshToken } = await authService.login({ login, password, ip, userAgent });
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS);
    res.json({ accessToken, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) return res.status(401).json({ error: { message: 'No refresh token' } });
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const { accessToken, refreshToken } = await authService.refresh(token, ip, userAgent);
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS);
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) await authService.logout(token);
    res.clearCookie(REFRESH_COOKIE);
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

async function verifyEmail(req, res, next) {
  try {
    await authService.verifyEmail(req.params.token);
    res.json({ message: 'Email verified' });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    await authService.forgotPassword(req.body.email);
    res.json({ message: 'If that email exists, a reset link was sent.' });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json({ message: 'Password updated' });
  } catch (err) {
    next(err);
  }
}

async function resendVerification(req, res, next) {
  try {
    const userId = req.user.sub || req.user.id;
    await authService.resendVerification(userId);
    res.json({ message: 'Verification email sent' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout, verifyEmail, forgotPassword, resetPassword, resendVerification };
