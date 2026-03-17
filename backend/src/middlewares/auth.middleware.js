const tokenService = require('../modules/auth/token.service');
const { getLogger, withRequestContext } = require('../lib/logger');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    withRequestContext(
      {
        requestId: req.requestId,
        ip: req.ip,
        method: req.method,
        route: req.originalUrl || req.url,
      },
      () => {
        const log = getLogger('security');
        log.warn(
          {
            event: 'login_failed',
            reason: 'missing_authorization_header',
          },
          'Missing auth header',
        );
      },
    );

    return res.status(401).json({ error: { message: 'Unauthorized' } });
  }
  try {
    const payload = tokenService.verifyAccessToken(header.slice(7));
    req.user = payload;
    withRequestContext(
      {
        requestId: req.requestId,
        ip: req.ip,
        method: req.method,
        route: req.originalUrl || req.url,
        userId: payload.id || payload.sub,
      },
      () => {
        const log = getLogger('security');
        log.info(
          {
            event: 'auth_token_valid',
            userId: payload.id || payload.sub,
          },
          'Auth token validated',
        );
      },
    );
    next();
  } catch {
    withRequestContext(
      {
        requestId: req.requestId,
        ip: req.ip,
        method: req.method,
        route: req.originalUrl || req.url,
      },
      () => {
        const log = getLogger('security');
        log.warn(
          {
            event: 'login_failed',
            reason: 'invalid_or_expired_token',
          },
          'Invalid or expired token',
        );
      },
    );
    res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next();
  }

  try {
    req.user = tokenService.verifyAccessToken(header.slice(7));
  } catch {
    req.user = null;
  }

  return next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      withRequestContext(
        {
          requestId: req.requestId,
          ip: req.ip,
          method: req.method,
          route: req.originalUrl || req.url,
          userId: req.user?.id || req.user?.sub,
        },
        () => {
          const log = getLogger('security');
          log.warn(
            {
              event: 'authorization_failed',
              requiredRoles: roles,
              userRole: req.user?.role,
            },
            'Authorization failed',
          );
        },
      );

      return res.status(403).json({ error: { message: 'Forbidden' } });
    }
    next();
  };
}

module.exports = { requireAuth, optionalAuth, requireRole };
