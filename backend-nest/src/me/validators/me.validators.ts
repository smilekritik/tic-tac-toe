import { isPlainObject, type ValidationFieldError } from '../../common/validation/validation.helpers';
import {
  normalizeEmail,
  validateEmail as validateAuthEmail,
  validatePassword as validateAuthPassword,
  validateUsername as validateAuthUsername,
} from '../../auth/validators/auth.validators';

type AddError = (field: string, message: string, location?: string) => void;

function createAddError(errors: ValidationFieldError[]): AddError {
  return (field, message, location = 'body') => {
    errors.push({ field, message, location });
  };
}

function validateUsername(value: unknown, addError: AddError, field = 'username'): string {
  const errors: ValidationFieldError[] = [];
  const username = validateAuthUsername(value, errors, field);
  for (const error of errors) {
    addError(field, error.message, error.location);
  }
  return username;
}

function validateEmail(value: unknown, addError: AddError, field = 'email'): string {
  const errors: ValidationFieldError[] = [];
  const email = validateAuthEmail(value, errors, field);
  for (const error of errors) {
    addError(field, error.message, error.location);
  }
  return email;
}

function validatePassword(value: unknown, addError: AddError, field: string): string {
  if (field === 'currentPassword') {
    const password = typeof value === 'string' ? value : '';
    if (!password) {
      addError(field, 'Current password is required');
    }
    return password;
  }

  const errors: ValidationFieldError[] = [];
  const password = validateAuthPassword(value, errors, field);
  for (const error of errors) {
    addError(field, error.message, error.location);
  }
  return password;
}

export function parseUpdateUsernameBody(body: unknown): { value: { username: string }; errors: ValidationFieldError[] } {
  const errors: ValidationFieldError[] = [];
  const addError = createAddError(errors);

  if (!isPlainObject(body)) {
    addError('_', 'Body must be a JSON object');
    return { value: { username: '' }, errors };
  }

  return {
    value: {
      username: validateUsername(body.username, addError),
    },
    errors,
  };
}

export function parseRequestEmailChangeBody(body: unknown): { value: { email: string }; errors: ValidationFieldError[] } {
  const errors: ValidationFieldError[] = [];
  const addError = createAddError(errors);

  if (!isPlainObject(body)) {
    addError('_', 'Body must be a JSON object');
    return { value: { email: '' }, errors };
  }

  return {
    value: {
      email: validateEmail(body.email, addError),
    },
    errors,
  };
}

export function parseUsernameAvailabilityQuery(query: unknown): { value: { username: string }; errors: ValidationFieldError[] } {
  const errors: ValidationFieldError[] = [];
  const addError = createAddError(errors);

  if (!isPlainObject(query)) {
    errors.push({ field: '_', message: 'Query must be an object', location: 'query' });
    return { value: { username: '' }, errors };
  }

  return {
    value: {
      username: validateUsername(query.username, (field, message) => addError(field, message, 'query')),
    },
    errors,
  };
}

export function parseUpdateSettingsBody(body: unknown): { value: Record<string, unknown>; errors: ValidationFieldError[] } {
  const errors: ValidationFieldError[] = [];
  const addError = createAddError(errors);

  if (!isPlainObject(body)) {
    addError('_', 'Body must be a JSON object');
    return { value: {}, errors };
  }

  const result: Record<string, unknown> = { ...body };

  if (body.username !== undefined) {
    result.username = validateUsername(body.username, addError);
  }

  if (body.email !== undefined) {
    result.email = validateEmail(body.email, addError);
  }

  if (body.preferredLanguage !== undefined) {
    const preferredLanguage =
      typeof body.preferredLanguage === 'string'
        ? body.preferredLanguage.trim().toLowerCase()
        : body.preferredLanguage;

    if (!['en', 'uk', 'pl'].includes(String(preferredLanguage))) {
      addError('preferredLanguage', 'Language must be one of: en, uk, pl');
    }

    result.preferredLanguage = preferredLanguage;
  }

  if (body.chatEnabledDefault !== undefined && typeof body.chatEnabledDefault !== 'boolean') {
    addError('chatEnabledDefault', 'Chat setting must be boolean');
  }

  if (body.publicProfileEnabled !== undefined && typeof body.publicProfileEnabled !== 'boolean') {
    addError('publicProfileEnabled', 'Public profile setting must be boolean');
  }

  return { value: result, errors };
}

export function parseChangePasswordBody(body: unknown): { value: { currentPassword: string; newPassword: string }; errors: ValidationFieldError[] } {
  const errors: ValidationFieldError[] = [];
  const addError = createAddError(errors);

  if (!isPlainObject(body)) {
    addError('_', 'Body must be a JSON object');
    return {
      value: { currentPassword: '', newPassword: '' },
      errors,
    };
  }

  return {
    value: {
      currentPassword: validatePassword(body.currentPassword, addError, 'currentPassword'),
      newPassword: validatePassword(body.newPassword, addError, 'newPassword'),
    },
    errors,
  };
}

export function parseDeleteAccountBody(body: unknown): { value: { password: string }; errors: ValidationFieldError[] } {
  const errors: ValidationFieldError[] = [];
  const addError = createAddError(errors);

  if (!isPlainObject(body)) {
    addError('_', 'Body must be a JSON object');
    return { value: { password: '' }, errors };
  }

  const password = typeof body.password === 'string' ? body.password : '';
  if (!password) {
    addError('password', 'Password is required');
  }

  return {
    value: { password },
    errors,
  };
}
