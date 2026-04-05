import fs from 'node:fs';
import path from 'node:path';

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
process.env.UPLOAD_PATH = process.env.UPLOAD_PATH || path.join('tests', '.tmp-uploads');
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'silent';
process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || '4';
process.env.HTTP_RATE_LIMIT_MAX = process.env.HTTP_RATE_LIMIT_MAX || '1000';
process.env.AUTH_RATE_LIMIT_MAX = process.env.AUTH_RATE_LIMIT_MAX || '1000';
process.env.LOGIN_RATE_LIMIT_MAX = process.env.LOGIN_RATE_LIMIT_MAX || '1000';
process.env.UPLOAD_RATE_LIMIT_MAX = process.env.UPLOAD_RATE_LIMIT_MAX || '1000';
process.env.GAME_TURN_TIMEOUT_MS = process.env.GAME_TURN_TIMEOUT_MS || '200';
process.env.GAME_CHAT_RATE_LIMIT_MS = process.env.GAME_CHAT_RATE_LIMIT_MS || '200';

const baseDatabaseUrl = (
  process.env.DATABASE_URL || 'postgresql://postgres:password@127.0.0.1:5432/tictactoe?schema=public'
).replace(/"/g, '');

process.env.DATABASE_URL = process.env.RUN_WS_E2E === 'true'
  ? baseDatabaseUrl
  : baseDatabaseUrl.replace('@postgres:', '@127.0.0.1:');

fs.mkdirSync(path.resolve(process.cwd(), process.env.UPLOAD_PATH), { recursive: true });
