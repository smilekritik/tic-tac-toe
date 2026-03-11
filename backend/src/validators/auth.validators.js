const { isPlainObject } = require('../middlewares/validate.middleware');

const USERNAME_RE = /^[A-Za-z0-9_-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value) {
  if (typeof value !== 'string') return value;
  return value.trim().toLowerCase();
}

function normalizeUsername(value) {
  if (typeof value !== 'string') return value;
  return value.trim().toLowerCase();
}

function validateEmail(value, { addError, field = 'email' } = {}) {
  const email = normalizeEmail(value);
  if (typeof email !== 'string' || !email.length) addError?.(field, 'Email is required');
  else if (email.length > 254) addError?.(field, 'Email is too long (max 254)');
  else if (!EMAIL_RE.test(email)) addError?.(field, 'Email must be a valid email address');
  return email;
}

function validateUsername(value, { addError, field = 'username' } = {}) {
  const username = normalizeUsername(value);
  if (typeof username !== 'string' || !username.length) addError?.(field, 'Username is required');
  else if (username.length < 3 || username.length > 24) addError?.(field, 'Username must be 3–24 characters');
  else if (/\s/.test(username)) addError?.(field, 'Username must not contain spaces');
  else if (!USERNAME_RE.test(username)) addError?.(field, 'Username may only contain letters, numbers, "_" and "-"');
  return username;
}

function validatePassword(value, { addError, field = 'password', username, email } = {}) {
  const password = typeof value === 'string' ? value : '';

  if (!password) addError?.(field, 'Password is required');
  else if (password.length < 8) addError?.(field, 'Password must be at least 8 characters');
  else if (password.length > 72) addError?.(field, 'Password is too long (max 72)');
  else {
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /\d/.test(password);
    if (!hasLetter || !hasNumber) addError?.(field, 'Password must include letters and numbers');

    const p = password.toLowerCase();
    const u = typeof username === 'string' && username.length ? username.toLowerCase() : null;
    const e = typeof email === 'string' && email.length ? email.toLowerCase() : null;
    if (u && p.includes(u)) addError?.(field, 'Password must not contain your username');
    if (e && p.includes(e)) addError?.(field, 'Password must not contain your email');
  }

  return password;
}

function registrationBody(body, { addError } = {}) {
  if (!isPlainObject(body)) {
    addError?.('_', 'Body must be a JSON object');
    return body;
  }

  const email = validateEmail(body.email, { addError, field: 'email' });
  const username = validateUsername(body.username, { addError, field: 'username' });
  const password = validatePassword(body.password, { addError, field: 'password', username, email });

  return { ...body, email, username, password };
}

function loginBody(body, { addError } = {}) {
  if (!isPlainObject(body)) {
    addError?.('_', 'Body must be a JSON object');
    return body;
  }

  const rawLogin = typeof body.login === 'string' ? body.login.trim() : '';
  if (!rawLogin) addError?.('login', 'Login is required');

  const login = rawLogin.includes('@') ? normalizeEmail(rawLogin) : normalizeUsername(rawLogin);
  const password = typeof body.password === 'string' ? body.password : '';
  if (!password) addError?.('password', 'Password is required');

  return { ...body, login, password };
}

function forgotPasswordBody(body, { addError } = {}) {
  if (!isPlainObject(body)) {
    addError?.('_', 'Body must be a JSON object');
    return body;
  }

  const email = validateEmail(body.email, { addError, field: 'email' });
  return { ...body, email };
}

function resetPasswordBody(body, { addError } = {}) {
  if (!isPlainObject(body)) {
    addError?.('_', 'Body must be a JSON object');
    return body;
  }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token) addError?.('token', 'Token is required');

  const password = validatePassword(body.password, { addError, field: 'password' });
  return { ...body, token, password };
}

module.exports = { normalizeEmail, normalizeUsername, validateEmail, validateUsername, validatePassword, registrationBody, loginBody, forgotPasswordBody, resetPasswordBody };
