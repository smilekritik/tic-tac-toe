const { getLogger, withRequestContext } = require('../lib/logger');

const SENSITIVE_KEYS = ['password', 'newPassword', 'token', 'refreshToken', 'accessToken'];

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return undefined;
  const clone = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) continue;
    if (value && typeof value === 'object') {
      clone[key] = sanitizeObject(value);
    } else {
      clone[key] = value;
    }
  }
  return clone;
}

function httpLogger(req, res, next) {
  const start = Date.now();
  const baseLog = getLogger('http');

  const requestPayload = {
    event: 'request_start',
    requestId: req.requestId,
    method: req.method,
    route: req.originalUrl || req.url,
    ip: req.ip,
    userId: req.user?.id || req.user?.sub,
    userAgent: req.headers['user-agent'],
    query: sanitizeObject(req.query),
    params: sanitizeObject(req.params),
    body: sanitizeObject(req.body),
  };

  baseLog.info(requestPayload, 'Incoming request');

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const context = {
      requestId: req.requestId,
      ip: req.ip,
      method: req.method,
      route: req.originalUrl || req.url,
      userId: req.user?.id || req.user?.sub,
    };

    withRequestContext(context, () => {
      const log = getLogger('http');
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      const payload = {
        event: 'request_finish',
        requestId: req.requestId,
        statusCode: res.statusCode,
        durationMs,
        ip: req.ip,
        method: req.method,
        route: req.originalUrl || req.url,
        userId: req.user?.id || req.user?.sub,
      };
      log[level](payload, 'Request completed');
    });
  });

  next();
}

module.exports = httpLogger;

