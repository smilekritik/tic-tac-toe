import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { AppError } from '../common/errors/app-error';
import { deleteUsersWithRelations } from '../common/helpers/delete-users-with-relations';
import {
  EMAIL_VERIFICATION_GRACE_MS,
  isEmailVerificationExpired,
} from '../common/helpers/email-verification-window';
import { BusinessRateLimitService } from '../common/rate-limit/rate-limit';
import {
  addMilliseconds,
  isBeforeNow,
  nowDate,
  subtractMilliseconds,
} from '../common/time/dayjs';
import { AppConfigService } from '../config/app-config.service';
import { AppLoggerService } from '../logger/logger.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
    private readonly tokenService: TokenService,
    private readonly mailService: MailService,
    private readonly config: AppConfigService,
    private readonly businessRateLimit: BusinessRateLimitService,
  ) {}

  async register(input: { email: string; username: string; password: string; lang?: string }): Promise<{ user: User; verifyToken: string }> {
    await this.cleanupExpiredUnverifiedUsers();
    const log = this.logger.getLogger('auth');

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: input.email, mode: 'insensitive' } },
          { username: { equals: input.username, mode: 'insensitive' } },
        ],
      },
    });

    if (existing) {
      const emailTaken = existing.email.toLowerCase() === input.email.toLowerCase();
      const code = emailTaken ? 'EMAIL_TAKEN' : 'USERNAME_TAKEN';
      log.warn(
        {
          event: 'register_conflict',
          code,
          email: input.email,
          username: input.username,
        },
        'Registration conflict',
      );
      throw new AppError(code, 409);
    }

    const passwordHash = await bcrypt.hash(input.password, this.config.security.bcryptRounds);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        username: input.username,
        passwordHash,
        profile: { create: {} },
      },
    });

    const verifyToken = await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: crypto.randomBytes(32).toString('hex'),
        expiresAt: addMilliseconds(nowDate(), 24 * 60 * 60 * 1000).toDate(),
      },
    });

    await this.mailService.sendVerificationEmail(
      user.email,
      verifyToken.token,
      input.lang || 'en',
      { userId: user.id },
    ).catch(() => undefined);

    log.info(
      {
        event: 'register_success',
        userId: user.id,
        email: user.email,
      },
      'User registered',
    );

    return { user, verifyToken: verifyToken.token };
  }

  async login(input: {
    login: string;
    password: string;
    ip?: string;
    userAgent?: string;
  }): Promise<{ user: Pick<User, 'id' | 'username' | 'role'>; accessToken: string; refreshToken: string }> {
    await this.cleanupExpiredUnverifiedUsers();
    const log = this.logger.getLogger('auth');

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: input.login, mode: 'insensitive' } },
          { username: { equals: input.login, mode: 'insensitive' } },
        ],
      },
    });

    const success = user ? await bcrypt.compare(input.password, user.passwordHash) : false;

    if (user) {
      await this.prisma.userLoginHistory.create({
        data: {
          userId: user.id,
          ipAddress: input.ip,
          userAgent: input.userAgent,
          success,
        },
      }).catch(() => undefined);
    }

    if (!user || !success) {
      log.warn(
        {
          event: 'login_failed',
          ip: input.ip,
          userAgent: input.userAgent,
          login: input.login,
        },
        'Login failed',
      );
      throw new AppError('INVALID_CREDENTIALS', 401);
    }

    if (isEmailVerificationExpired(user)) {
      await this.prisma.$transaction(async (tx) => {
        await deleteUsersWithRelations(tx, [user.id]);
      }).catch(() => undefined);
      throw new AppError('EMAIL_VERIFICATION_EXPIRED', 403);
    }

    const accessToken = this.tokenService.generateAccessToken({
      id: user.id,
      role: user.role,
    });
    const refresh = this.tokenService.generateRefreshToken();

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refresh.hash,
        expiresAt: refresh.expiresAt,
        ipAddress: input.ip,
        userAgent: input.userAgent,
      },
    });

    log.info(
      {
        event: 'login_success',
        userId: user.id,
        ip: input.ip,
        userAgent: input.userAgent,
      },
      'Login success',
    );

    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      accessToken,
      refreshToken: refresh.token,
    };
  }

  async refresh(refreshToken: string, ip?: string, userAgent?: string): Promise<{ accessToken: string; refreshToken: string }> {
    await this.cleanupExpiredUnverifiedUsers();
    const log = this.logger.getLogger('auth');
    const hash = this.tokenService.hashToken(refreshToken);

    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: hash, revokedAt: null },
    });

    if (!stored || isBeforeNow(stored.expiresAt)) {
      throw new AppError('TOKEN_INVALID', 401);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
    });

    if (!user) {
      throw new AppError('TOKEN_INVALID', 401);
    }

    if (isEmailVerificationExpired(user)) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: user.id },
        data: { revokedAt: nowDate() },
      });
      await this.prisma.$transaction(async (tx) => {
        await deleteUsersWithRelations(tx, [user.id]);
      }).catch(() => undefined);
      throw new AppError('EMAIL_VERIFICATION_EXPIRED', 401);
    }

    const accessToken = this.tokenService.generateAccessToken({
      id: user.id,
      role: user.role,
    });

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: nowDate() },
    });

    const nextRefresh = this.tokenService.generateRefreshToken();
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: nextRefresh.hash,
        expiresAt: nextRefresh.expiresAt,
        ipAddress: ip,
        userAgent,
      },
    });

    log.info(
      {
        event: 'token_refresh',
        userId: user.id,
        ip,
      },
      'Token refreshed',
    );

    return {
      accessToken,
      refreshToken: nextRefresh.token,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const hash = this.tokenService.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hash },
      data: { revokedAt: nowDate() },
    });
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
    });

    if (!record || isBeforeNow(record.expiresAt)) {
      throw new AppError('TOKEN_INVALID', 400);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: record.userId },
    });

    if (record.usedAt) {
      if (user?.emailVerified) {
        return { message: 'Email already verified' };
      }

      throw new AppError('TOKEN_INVALID', 400);
    }

    await this.prisma.emailVerificationToken.update({
      where: { token },
      data: { usedAt: nowDate() },
    });

    await this.prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    });

    return { message: 'Email verified' };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user) {
      return;
    }

    this.businessRateLimit.enforce({
      key: `pwdReset:user:${user.id}:cooldown`,
      minIntervalMs: 60 * 1000,
    });
    this.businessRateLimit.enforce({
      key: `pwdReset:user:${user.id}:burst`,
      maxInWindow: 3,
      windowMs: 10 * 60 * 1000,
    });

    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: nowDate() },
    });

    const record = await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: crypto.randomBytes(32).toString('hex'),
        expiresAt: addMilliseconds(nowDate(), 60 * 60 * 1000).toDate(),
      },
    });

    const lang = user.profile?.preferredLanguage || 'en';
    await this.mailService.sendPasswordResetEmail(
      user.email,
      record.token,
      lang,
      { userId: user.id },
    ).catch(() => undefined);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record || record.usedAt || isBeforeNow(record.expiresAt)) {
      throw new AppError('TOKEN_EXPIRED', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, this.config.security.bcryptRounds);
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
    await this.prisma.passwordResetToken.update({
      where: { token },
      data: { usedAt: nowDate() },
    });
  }

  async resendVerification(userId: string): Promise<{ message: string }> {
    await this.cleanupExpiredUnverifiedUsers();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404);
    }

    if (user.emailVerified) {
      throw new AppError('EMAIL_ALREADY_VERIFIED', 400);
    }

    if (isEmailVerificationExpired(user)) {
      await this.prisma.$transaction(async (tx) => {
        await deleteUsersWithRelations(tx, [user.id]);
      }).catch(() => undefined);
      throw new AppError('EMAIL_VERIFICATION_EXPIRED', 403);
    }

    this.businessRateLimit.enforce({
      key: `verifyEmail:user:${user.id}`,
      minIntervalMs: 60 * 1000,
    });

    await this.prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: nowDate() },
    });

    const verifyToken = await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: crypto.randomBytes(32).toString('hex'),
        expiresAt: addMilliseconds(nowDate(), 24 * 60 * 60 * 1000).toDate(),
      },
    });

    const lang = user.profile?.preferredLanguage || 'en';
    await this.mailService.sendVerificationEmail(
      user.email,
      verifyToken.token,
      lang,
      { userId: user.id },
    ).catch(() => undefined);

    return { message: 'Verification email sent' };
  }

  private async cleanupExpiredUnverifiedUsers(): Promise<void> {
    const cutoff = subtractMilliseconds(nowDate(), EMAIL_VERIFICATION_GRACE_MS).toDate();
    const expiredUsers = await this.prisma.user.findMany({
      where: {
        emailVerified: false,
        createdAt: { lte: cutoff },
      },
      select: { id: true },
    });

    if (!expiredUsers.length) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await deleteUsersWithRelations(tx, expiredUsers.map((user) => user.id));
    });
  }
}
