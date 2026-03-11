const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const { getLogger, withRequestContext } = require('../lib/logger');

function getUserOrIpKey(req) {
  const userId = req.user?.sub || req.user?.id;
  if (userId) return `user:${userId}`;
  return `ip:${req.ip}`;
}

function createRateLimiter({
  windowMs,
  max,
  keyGenerator,
  code = 'RATE_LIMITED',
  message = 'Too many requests',
}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyGenerator || ((req) => req.ip),
    handler: (req, res) => {
      const context = {
        requestId: req.requestId,
        ip: req.ip,
        method: req.method,
        route: req.originalUrl || req.url,
        userId: req.user?.id || req.user?.sub,
      };
      withRequestContext(context, () => {
        const log = getLogger('security');
        log.warn(
          {
            event: 'http_rate_limit_hit',
            requestId: req.requestId,
            ip: req.ip,
            route: req.originalUrl || req.url,
            method: req.method,
            code,
          },
          'HTTP rate limit hit',
        );
      });

      res.status(429).json({
        error: {
          code,
          message,
        },
      });
    },
  });
}

const apiLimiter = createRateLimiter({
  windowMs: env.security.httpRateLimitWindowMs,
  max: env.security.httpRateLimitMax,
  code: 'HTTP_RATE_LIMIT',
  message: 'Too many requests',
});

const authLimiter = createRateLimiter({
  windowMs: env.security.authRateLimitWindowMs,
  max: env.security.authRateLimitMax,
  code: 'AUTH_RATE_LIMIT',
  message: 'Too many auth requests',
});

const loginLimiter = createRateLimiter({
  windowMs: env.security.loginRateLimitWindowMs,
  max: env.security.loginRateLimitMax,
  code: 'LOGIN_RATE_LIMIT',
  message: 'Too many login attempts',
});

const uploadLimiter = createRateLimiter({
  windowMs: env.security.uploadRateLimitWindowMs,
  max: env.security.uploadRateLimitMax,
  keyGenerator: getUserOrIpKey,
  code: 'UPLOAD_RATE_LIMIT',
  message: 'Too many uploads',
});

module.exports = { createRateLimiter, getUserOrIpKey, apiLimiter, authLimiter, loginLimiter, uploadLimiter };

