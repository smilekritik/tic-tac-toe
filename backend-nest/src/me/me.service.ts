import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Injectable } from '@nestjs/common';
import { AppError } from '../common/errors/app-error';
import { deleteUsersWithRelations } from '../common/helpers/delete-users-with-relations';
import {
  getEmailVerificationDeadline,
  isEmailVerificationExpired,
} from '../common/helpers/email-verification-window';
import { BusinessRateLimitService } from '../common/rate-limit/rate-limit';
import { addMilliseconds, isBeforeNow, nowDate } from '../common/time/dayjs';
import { AppConfigService } from '../config/app-config.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import type {
  ChangePasswordDto,
  UpdateProfileDto,
  UpdateSettingsDto,
} from './dto/me.dto';
import { normalizeEmail } from '../auth/validators/auth.validators';

@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly config: AppConfigService,
    private readonly businessRateLimit: BusinessRateLimitService,
    private readonly uploadsService: UploadsService,
  ) {}

  async getMe(userId: string): Promise<Record<string, unknown>> {
    const [user, gameModes] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          emailVerified: true,
          role: true,
          createdAt: true,
          profile: {
            select: {
              avatarPath: true,
              preferredLanguage: true,
              chatEnabledDefault: true,
              publicProfileEnabled: true,
            },
          },
          ratings: {
            select: {
              eloRating: true,
              gamesPlayed: true,
              wins: true,
              losses: true,
              draws: true,
              winStreak: true,
              maxWinStreak: true,
              gameMode: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.gameMode.findMany({
        where: {
          isEnabled: true,
          isRanked: true,
        },
        select: {
          code: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404);
    }

    if (isEmailVerificationExpired(user)) {
      await this.prisma.$transaction(async (tx) => {
        await deleteUsersWithRelations(tx, [userId]);
      }).catch(() => undefined);
      throw new AppError('EMAIL_VERIFICATION_EXPIRED', 401);
    }

    return {
      ...user,
      emailVerificationDeadlineAt: user.emailVerified
        ? null
        : getEmailVerificationDeadline(user.createdAt),
      ratings: this.hydrateRatings(gameModes, user.ratings),
    };
  }

  async updateProfile(userId: string, input: UpdateProfileDto) {
    return this.prisma.userProfile.update({
      where: { userId },
      data: {
        ...(input.preferredLanguage !== undefined && { preferredLanguage: input.preferredLanguage }),
        ...(input.chatEnabledDefault !== undefined && { chatEnabledDefault: input.chatEnabledDefault }),
        ...(input.publicProfileEnabled !== undefined && { publicProfileEnabled: input.publicProfileEnabled }),
      },
    });
  }

  async updateUsername(userId: string, username: string) {
    const existing = await this.prisma.user.findFirst({
      where: {
        username: { equals: username, mode: 'insensitive' },
        NOT: { id: userId },
      },
      select: { id: true },
    });

    if (existing) {
      throw new AppError('USERNAME_TAKEN', 409);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { username },
      select: { id: true, username: true },
    });
  }

  async checkUsernameAvailability(userId: string, username: string): Promise<{ username: string; available: boolean }> {
    const existing = await this.prisma.user.findFirst({
      where: {
        username: { equals: username, mode: 'insensitive' },
        NOT: { id: userId },
      },
      select: { id: true },
    });

    return {
      username,
      available: !existing,
    };
  }

  async requestEmailChange(userId: string, newEmail: string): Promise<{ message: string }> {
    this.businessRateLimit.enforce({
      key: `emailChange:user:${userId}`,
      minIntervalMs: 60 * 1000,
    });

    const existing = await this.prisma.user.findFirst({
      where: {
        email: { equals: newEmail, mode: 'insensitive' },
        NOT: { id: userId },
      },
      select: { id: true },
    });

    if (existing) {
      throw new AppError('EMAIL_TAKEN', 409);
    }

    await this.prisma.userEmailChange.updateMany({
      where: { userId, confirmedAt: null },
      data: { confirmedAt: nowDate() },
    });

    const record = await this.prisma.userEmailChange.create({
      data: {
        userId,
        newEmail,
        token: crypto.randomBytes(32).toString('hex'),
        expiresAt: addMilliseconds(nowDate(), 24 * 60 * 60 * 1000).toDate(),
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    const lang = user?.profile?.preferredLanguage || 'en';
    await this.mailService.sendEmailChangeConfirmation(
      newEmail,
      record.token,
      lang,
      { userId },
    ).catch(() => undefined);

    return { message: 'Confirmation email sent' };
  }

  async confirmEmailChange(token: string): Promise<{ message: string }> {
    const normalizedToken = typeof token === 'string' ? token.trim() : '';
    if (!normalizedToken) {
      throw new AppError('TOKEN_INVALID', 400);
    }

    const record = await this.prisma.userEmailChange.findUnique({
      where: { token: normalizedToken },
    });

    if (!record) {
      throw new AppError('TOKEN_INVALID', 400);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: record.userId },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      throw new AppError('TOKEN_INVALID', 400);
    }

    if (record.confirmedAt) {
      if (normalizeEmail(user.email) === normalizeEmail(record.newEmail)) {
        return { message: 'Email already confirmed' };
      }

      throw new AppError('TOKEN_INVALID', 400);
    }

    if (isBeforeNow(record.expiresAt)) {
      throw new AppError('TOKEN_EXPIRED', 400);
    }

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findFirst({
        where: {
          email: { equals: record.newEmail, mode: 'insensitive' },
          NOT: { id: record.userId },
        },
        select: { id: true },
      });

      if (existing) {
        throw new AppError('EMAIL_TAKEN', 409);
      }

      const now = nowDate();

      await tx.user.update({
        where: { id: record.userId },
        data: {
          email: record.newEmail,
          emailVerified: true,
        },
      });

      await tx.userEmailChange.update({
        where: { token: normalizedToken },
        data: { confirmedAt: now },
      });

      await tx.userEmailChange.updateMany({
        where: {
          userId: record.userId,
          confirmedAt: null,
          NOT: { token: normalizedToken },
        },
        data: { confirmedAt: now },
      });

      await tx.refreshToken.updateMany({
        where: { userId: record.userId },
        data: { revokedAt: now },
      });
    });

    return { message: 'Email updated' };
  }

  async updateSettings(userId: string, input: UpdateSettingsDto): Promise<Record<string, unknown>> {
    const updates: Promise<unknown>[] = [];

    if (input.username !== undefined) {
      updates.push(this.updateUsername(userId, input.username));
    }

    if (input.email !== undefined) {
      updates.push(this.requestEmailChange(userId, input.email));
    }

    if (
      input.preferredLanguage !== undefined ||
      input.chatEnabledDefault !== undefined ||
      input.publicProfileEnabled !== undefined
    ) {
      updates.push(this.updateProfile(userId, input));
    }

    await Promise.all(updates);
    return this.getMe(userId);
  }

  async changePassword(userId: string, input: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404);
    }

    const passwordMatches = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!passwordMatches) {
      throw new AppError('INVALID_CREDENTIALS', 401);
    }

    const nextPasswordHash = await bcrypt.hash(input.newPassword, this.config.security.bcryptRounds);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: nextPasswordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { revokedAt: nowDate() },
      }),
    ]);

    return { message: 'Password updated' };
  }

  async uploadAvatar(userId: string, buffer: Buffer): Promise<{ avatarPath: string | null }> {
    this.businessRateLimit.enforce({
      key: `avatar:user:${userId}`,
      maxInWindow: 5,
      windowMs: 10 * 60 * 1000,
    });

    const persisted = await this.uploadsService.persistImageFromBuffer(buffer);
    const currentProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { avatarPath: true },
    });

    try {
      const profile = await this.prisma.userProfile.update({
        where: { userId },
        data: { avatarPath: persisted.publicPath },
      });

      const previousAvatarAbsolutePath = this.uploadsService.resolveManagedUploadPath(currentProfile?.avatarPath);
      if (previousAvatarAbsolutePath && previousAvatarAbsolutePath !== persisted.absolutePath) {
        await this.uploadsService.removeFile(previousAvatarAbsolutePath);
      }

      return { avatarPath: profile.avatarPath };
    } catch (error) {
      await this.uploadsService.removeFile(persisted.absolutePath);
      throw error;
    }
  }

  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404);
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new AppError('INVALID_CREDENTIALS', 401);
    }

    const avatarPath = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { avatarPath: true },
    });

    const managedAvatarAbsolutePath = this.uploadsService.resolveManagedUploadPath(avatarPath?.avatarPath);

    await this.prisma.$transaction(async (tx) => {
      await tx.adminLog.deleteMany({
        where: {
          OR: [{ targetUserId: userId }, { adminUserId: userId }],
        },
      });

      await tx.match.deleteMany({
        where: {
          OR: [{ playerXId: userId }, { playerOId: userId }, { winnerId: userId }],
        },
      });

      await tx.user.delete({
        where: { id: userId },
      });
    });

    await this.uploadsService.removeFile(managedAvatarAbsolutePath);
  }

  private hydrateRatings(
    gameModes: Array<{ code: string; name: string }>,
    ratings: Array<{
      eloRating: number;
      gamesPlayed: number;
      wins: number;
      losses: number;
      draws: number;
      winStreak: number;
      maxWinStreak: number;
      gameMode: { code: string; name: string };
    }> = [],
  ) {
    const ratingByMode = new Map(ratings.map((rating) => [rating.gameMode.code, rating]));

    return gameModes.map((gameMode) => {
      const existingRating = ratingByMode.get(gameMode.code);
      if (existingRating) {
        return existingRating;
      }

      return {
        eloRating: 1000,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winStreak: 0,
        maxWinStreak: 0,
        gameMode: {
          code: gameMode.code,
          name: gameMode.name,
        },
      };
    });
  }
}
