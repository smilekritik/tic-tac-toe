const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;

  if (process.env.NODE_ENV === 'development') {
    console.error(`[${status}] ${err.message}`, err.stack);
  }

  res.status(status).json({
    error: {
      code: err.code || 'SOMETHING_WRONG',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

module.exports = errorHandler;
