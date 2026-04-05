import { Injectable } from '@nestjs/common';

type SmtpConfig = {
  host?: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from?: string;
};

type UploadConfig = {
  maxFileSize: number;
  path: string;
};

type SecurityConfig = {
  bcryptRounds: number;
  httpRateLimitWindowMs: number;
  httpRateLimitMax: number;
  authRateLimitWindowMs: number;
  authRateLimitMax: number;
  loginRateLimitWindowMs: number;
  loginRateLimitMax: number;
  uploadRateLimitWindowMs: number;
  uploadRateLimitMax: number;
};

@Injectable()
export class AppConfigService {
  readonly nodeEnv = process.env.NODE_ENV || 'development';
  readonly port = this.parseInt('PORT', 5001);
  readonly frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  readonly databaseUrl = process.env.DATABASE_URL;
  readonly logLevel = process.env.LOG_LEVEL || 'info';
  readonly jwt = {
    secret: process.env.JWT_SECRET || '',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  };
  readonly smtp: SmtpConfig = {
    host: process.env.SMTP_HOST,
    port: this.parseInt('SMTP_PORT', 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.EMAIL_FROM,
  };
  readonly upload: UploadConfig = {
    maxFileSize: this.parseInt('MAX_FILE_SIZE', 2 * 1024 * 1024),
    path: process.env.UPLOAD_PATH || './uploads',
  };
  readonly security: SecurityConfig = {
    bcryptRounds: this.parseInt('BCRYPT_ROUNDS', 10),
    httpRateLimitWindowMs: this.parseInt('HTTP_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    httpRateLimitMax: this.parseInt('HTTP_RATE_LIMIT_MAX', 300),
    authRateLimitWindowMs: this.parseInt('AUTH_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    authRateLimitMax: this.parseInt('AUTH_RATE_LIMIT_MAX', 100),
    loginRateLimitWindowMs: this.parseInt('LOGIN_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    loginRateLimitMax: this.parseInt('LOGIN_RATE_LIMIT_MAX', 20),
    uploadRateLimitWindowMs: this.parseInt('UPLOAD_RATE_LIMIT_WINDOW_MS', 10 * 60 * 1000),
    uploadRateLimitMax: this.parseInt('UPLOAD_RATE_LIMIT_MAX', 30),
  };

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  private parseInt(name: string, fallback: number): number {
    const value = Number.parseInt(process.env[name] || '', 10);
    return Number.isFinite(value) ? value : fallback;
  }
}
