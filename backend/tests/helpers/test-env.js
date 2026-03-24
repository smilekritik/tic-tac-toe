const path = require('path');

function applyTestEnv() {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/tictactoe_test';
  process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  process.env.UPLOAD_PATH = process.env.UPLOAD_PATH || path.join('tests', '.tmp-uploads');
}

module.exports = { applyTestEnv };
