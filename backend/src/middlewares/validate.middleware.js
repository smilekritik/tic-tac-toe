function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validate(validators) {
  return (req, res, next) => {
    try {
      if (!validators || typeof validators !== 'object') return next();

      const errors = [];

      for (const [location, validator] of Object.entries(validators)) {
        if (typeof validator !== 'function') continue;

        const value = req[location];
        const ctx = {
          req,
          location,
          addError: (field, message) => errors.push({ field, message, location }),
        };

        const result = validator(value, ctx);
        if (result && typeof result === 'object') {
          req[location] = result;
        }
      }

      if (errors.length) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: errors[0].message,
            fields: errors,
          },
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

function requireBodyObject(req, res, next) {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({
      error: { code: 'INVALID_BODY', message: 'Request body must be a JSON object' },
    });
  }
  next();
}

module.exports = { validate, requireBodyObject, isPlainObject };
