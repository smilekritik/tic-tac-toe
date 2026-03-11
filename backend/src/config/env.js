require('dotenv').config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT) || 5000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  db: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.EMAIL_FROM,
  },

  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 2097152,
    path: process.env.UPLOAD_PATH || './uploads',
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
    // General API HTTP rate limiting
    httpRateLimitWindowMs: parseInt(process.env.HTTP_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    httpRateLimitMax: parseInt(process.env.HTTP_RATE_LIMIT_MAX) || 300,

    // Auth endpoints HTTP rate limiting
    authRateLimitWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    authRateLimitMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 100,

    // Login endpoint HTTP rate limiting
    loginRateLimitWindowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    loginRateLimitMax: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 20,

    // Upload endpoints HTTP rate limiting
    uploadRateLimitWindowMs: parseInt(process.env.UPLOAD_RATE_LIMIT_WINDOW_MS) || 10 * 60 * 1000,
    uploadRateLimitMax: parseInt(process.env.UPLOAD_RATE_LIMIT_MAX) || 30,
  },
};

module.exports = env;
