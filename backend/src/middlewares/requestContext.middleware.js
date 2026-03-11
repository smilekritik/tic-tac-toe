const crypto = require('crypto');
const { withRequestContext, getLogger } = require('../lib/logger');

function generateRequestId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString('hex');
}

function requestContext(req, res, next) {
  const requestId = req.headers['x-request-id'] || generateRequestId();
  const ip = req.ip;
  const method = req.method;
  const route = req.originalUrl || req.url;

  const startTime = Date.now();

  const context = {
    requestId,
    ip,
    method,
    route,
    startTime,
  };

  req.requestId = requestId;
  req.context = context;

  withRequestContext(context, () => {
    req.log = getLogger('http');
    res.setHeader('x-request-id', requestId);
    next();
  });
}

module.exports = requestContext;

