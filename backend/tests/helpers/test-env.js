const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

function applyTestEnv({ loadDotenv = false } = {}) {
  if (loadDotenv) {
    const envPath = path.resolve(process.cwd(), '.env.test');
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  }

  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/tictactoe_test';
  process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  process.env.UPLOAD_PATH = process.env.UPLOAD_PATH || path.join('tests', '.tmp-uploads');
  process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'silent';
  process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || '4';
  process.env.HTTP_RATE_LIMIT_MAX = process.env.HTTP_RATE_LIMIT_MAX || '1000';
  process.env.AUTH_RATE_LIMIT_MAX = process.env.AUTH_RATE_LIMIT_MAX || '1000';
  process.env.LOGIN_RATE_LIMIT_MAX = process.env.LOGIN_RATE_LIMIT_MAX || '1000';
  process.env.UPLOAD_RATE_LIMIT_MAX = process.env.UPLOAD_RATE_LIMIT_MAX || '1000';
}

module.exports = { applyTestEnv };
