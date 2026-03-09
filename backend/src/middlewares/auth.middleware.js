const tokenService = require('../modules/auth/token.service');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: { message: 'Unauthorized' } });
  }
  try {
    const payload = tokenService.verifyAccessToken(header.slice(7));
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: { message: 'Forbidden' } });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
