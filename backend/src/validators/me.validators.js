const { isPlainObject } = require('../middlewares/validate.middleware');
const { validateEmail, validatePassword, validateUsername } = require('./auth.validators');

function updateUsernameBody(body, { addError } = {}) {
  if (!isPlainObject(body)) {
    addError?.('_', 'Body must be a JSON object');
    return body;
  }
  const username = validateUsername(body.username, { addError, field: 'username' });
  return { ...body, username };
}

function requestEmailChangeBody(body, { addError } = {}) {
  if (!isPlainObject(body)) {
    addError?.('_', 'Body must be a JSON object');
    return body;
  }
  const email = validateEmail(body.email, { addError, field: 'email' });
  return { ...body, email };
}

function checkUsernameAvailabilityQuery(query, { addError } = {}) {
  if (!isPlainObject(query)) {
    addError?.('_', 'Query must be an object');
    return query;
  }

  const username = validateUsername(query.username, { addError, field: 'username' });
  return { ...query, username };
}

function updateSettingsBody(body, { addError } = {}) {
  if (!isPlainObject(body)) {
    addError?.('_', 'Body must be a JSON object');
    return body;
  }

  const result = { ...body };

  if (body.username !== undefined) {
    result.username = validateUsername(body.username, { addError, field: 'username' });
  }

  if (body.email !== undefined) {
    result.email = validateEmail(body.email, { addError, field: 'email' });
  }

  if (body.preferredLanguage !== undefined) {
    const preferredLanguage =
      typeof body.preferredLanguage === 'string'
        ? body.preferredLanguage.trim().toLowerCase()
        : body.preferredLanguage;

    if (!['en', 'uk', 'pl'].includes(preferredLanguage)) {
      addError?.('preferredLanguage', 'Language must be one of: en, uk, pl');
    }

    result.preferredLanguage = preferredLanguage;
  }

  if (body.chatEnabledDefault !== undefined && typeof body.chatEnabledDefault !== 'boolean') {
    addError?.('chatEnabledDefault', 'Chat setting must be boolean');
  }

  if (
    body.publicProfileEnabled !== undefined &&
    typeof body.publicProfileEnabled !== 'boolean'
  ) {
    addError?.('publicProfileEnabled', 'Public profile setting must be boolean');
  }

  return result;
}

function changePasswordBody(body, { addError } = {}) {
  if (!isPlainObject(body)) {
    addError?.('_', 'Body must be a JSON object');
    return body;
  }

  const currentPassword =
    typeof body.currentPassword === 'string' ? body.currentPassword : '';
  if (!currentPassword) {
    addError?.('currentPassword', 'Current password is required');
  }

  const newPassword = validatePassword(body.newPassword, {
    addError,
    field: 'newPassword',
  });

  return { ...body, currentPassword, newPassword };
}

function deleteAccountBody(body, { addError } = {}) {
  if (!isPlainObject(body)) {
    addError?.('_', 'Body must be a JSON object');
    return body;
  }

  const password = typeof body.password === 'string' ? body.password : '';
  if (!password) {
    addError?.('password', 'Password is required');
  }

  return { ...body, password };
}

module.exports = {
  updateUsernameBody,
  requestEmailChangeBody,
  checkUsernameAvailabilityQuery,
  updateSettingsBody,
  changePasswordBody,
  deleteAccountBody,
};
