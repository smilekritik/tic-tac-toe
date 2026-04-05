import { isPlainObject, type ValidationFieldError } from '../../common/validation/validation.helpers';

const USERNAME_RE = /^[A-Za-z0-9_-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function addError(errors: ValidationFieldError[], field: string, message: string, location = 'body'): void {
  errors.push({ field, message, location });
}

export function normalizeEmail(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().toLowerCase();
}

function normalizeUsername(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().toLowerCase();
}

function validateEmail(value: unknown, errors: ValidationFieldError[], field = 'email'): string {
  const email = normalizeEmail(value);
  if (typeof email !== 'string' || !email.length) {
    addError(errors, field, 'Email is required');
  } else if (email.length > 254) {
    addError(errors, field, 'Email is too long (max 254)');
  } else if (!EMAIL_RE.test(email)) {
    addError(errors, field, 'Email must be a valid email address');
  }

  return typeof email === 'string' ? email : '';
}

function validateUsername(value: unknown, errors: ValidationFieldError[], field = 'username'): string {
  const username = normalizeUsername(value);
  if (typeof username !== 'string' || !username.length) {
    addError(errors, field, 'Username is required');
  } else if (username.length < 3 || username.length > 24) {
    addError(errors, field, 'Username must be 3–24 characters');
  } else if (/\s/.test(username)) {
    addError(errors, field, 'Username must not contain spaces');
  } else if (!USERNAME_RE.test(username)) {
    addError(errors, field, 'Username may only contain letters, numbers, "_" and "-"');
  }

  return typeof username === 'string' ? username : '';
}

function validatePassword(
  value: unknown,
  errors: ValidationFieldError[],
  field = 'password',
  username?: string,
  email?: string,
): string {
  const password = typeof value === 'string' ? value : '';

  if (!password) {
    addError(errors, field, 'Password is required');
  } else if (password.length < 8) {
    addError(errors, field, 'Password must be at least 8 characters');
  } else if (password.length > 72) {
    addError(errors, field, 'Password is too long (max 72)');
  } else {
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!hasLetter || !hasNumber) {
      addError(errors, field, 'Password must include letters and numbers');
    }

    const lowerPassword = password.toLowerCase();
    if (username && lowerPassword.includes(username.toLowerCase())) {
      addError(errors, field, 'Password must not contain your username');
    }
    if (email && lowerPassword.includes(email.toLowerCase())) {
      addError(errors, field, 'Password must not contain your email');
    }
  }

  return password;
}

export function parseRegistrationBody(body: unknown): { value: { email: string; username: string; password: string }; errors: ValidationFieldError[] } {
  const errors: ValidationFieldError[] = [];

  if (!isPlainObject(body)) {
    addError(errors, '_', 'Body must be a JSON object');
    return {
      value: { email: '', username: '', password: '' },
      errors,
    };
  }

  const email = validateEmail(body.email, errors);
  const username = validateUsername(body.username, errors);
  const password = validatePassword(body.password, errors, 'password', username, email);

  return {
    value: { email, username, password },
    errors,
  };
}

export function parseLoginBody(body: unknown): { value: { login: string; password: string }; errors: ValidationFieldError[] } {
  const errors: ValidationFieldError[] = [];

  if (!isPlainObject(body)) {
    addError(errors, '_', 'Body must be a JSON object');
    return {
      value: { login: '', password: '' },
      errors,
    };
  }

  const rawLogin = typeof body.login === 'string' ? body.login.trim() : '';
  if (!rawLogin) {
    addError(errors, 'login', 'Login is required');
  }

  const login = rawLogin.includes('@')
    ? String(normalizeEmail(rawLogin))
    : String(normalizeUsername(rawLogin));
  const password = typeof body.password === 'string' ? body.password : '';
  if (!password) {
    addError(errors, 'password', 'Password is required');
  }

  return {
    value: { login, password },
    errors,
  };
}

export function parseForgotPasswordBody(body: unknown): { value: { email: string }; errors: ValidationFieldError[] } {
  const errors: ValidationFieldError[] = [];

  if (!isPlainObject(body)) {
    addError(errors, '_', 'Body must be a JSON object');
    return { value: { email: '' }, errors };
  }

  return {
    value: {
      email: validateEmail(body.email, errors),
    },
    errors,
  };
}

export function parseResetPasswordBody(body: unknown): { value: { token: string; password: string }; errors: ValidationFieldError[] } {
  const errors: ValidationFieldError[] = [];

  if (!isPlainObject(body)) {
    addError(errors, '_', 'Body must be a JSON object');
    return {
      value: { token: '', password: '' },
      errors,
    };
  }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token) {
    addError(errors, 'token', 'Token is required');
  }

  return {
    value: {
      token,
      password: validatePassword(body.password, errors),
    },
    errors,
  };
}
