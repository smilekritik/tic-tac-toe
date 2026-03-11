const { isPlainObject } = require('../middlewares/validate.middleware');
const { validateEmail, validateUsername } = require('./auth.validators');

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

module.exports = { updateUsernameBody, requestEmailChangeBody };
