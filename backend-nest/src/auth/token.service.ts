import crypto from 'node:crypto';
import { Injectable } from '@nestjs/common';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { addMilliseconds, nowDate } from '../common/time/dayjs';
import { AppConfigService } from '../config/app-config.service';

type TokenUser = {
  id: string;
  role: string;
};

export type AccessTokenPayload = JwtPayload & {
  sub: string;
  role: string;
};

@Injectable()
export class TokenService {
  constructor(private readonly config: AppConfigService) {}

  generateAccessToken(user: TokenUser): string {
    return jwt.sign(
      { sub: user.id, role: user.role },
      this.config.jwt.secret,
      { expiresIn: this.config.jwt.accessExpiration as jwt.SignOptions['expiresIn'] },
    );
  }

  generateRefreshToken(): { token: string; hash: string; expiresAt: Date } {
    const token = crypto.randomBytes(40).toString('hex');
    const hash = this.hashToken(token);
    const expirationMs = this.parseRefreshExpiration(this.config.jwt.refreshExpiration);
    const expiresAt = addMilliseconds(nowDate(), expirationMs).toDate();
    return { token, hash, expiresAt };
  }

  parseRefreshExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }

    const value = Number.parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * (multipliers[unit] || 1000);
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, this.config.jwt.secret) as AccessTokenPayload;
  }
}
