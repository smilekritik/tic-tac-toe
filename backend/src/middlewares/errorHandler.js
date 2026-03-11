const { getLogger, withRequestContext } = require('../lib/logger');

const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;

  const context = {
    requestId: req.requestId,
    ip: req.ip,
    method: req.method,
    route: req.originalUrl || req.url,
    userId: req.user?.id || req.user?.sub,
  };

  withRequestContext(context, () => {
    const log = getLogger('app');
    const level = status >= 500 ? 'error' : 'warn';

    log[level](
      {
        event: 'error',
        requestId: req.requestId,
        status,
        code: err.code || 'SOMETHING_WRONG',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        meta: err.meta,
      },
      'Unhandled error',
    );
  });

  res.status(status).json({
    error: {
      code: err.code || 'SOMETHING_WRONG',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

module.exports = errorHandler;

