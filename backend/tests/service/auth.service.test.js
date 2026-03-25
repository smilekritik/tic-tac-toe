const path = require('path');

function applyOverrides(target, overrides = {}) {
  for (const [key, value] of Object.entries(overrides)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      applyOverrides(target[key], value);
    } else {
      target[key] = value;
    }
  }

  return target;
}

function mockCommonJsModule(modulePath, exportsValue) {
  delete require.cache[modulePath];
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports: exportsValue,
  };
}

function createPrismaMock() {
  const tx = {};
  const prisma = {
    user: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        username: 'user',
        role: 'user',
        emailVerified: false,
        createdAt: new Date('2026-03-01T00:00:00Z'),
      }),
      update: vi.fn().mockResolvedValue({}),
    },
    refreshToken: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    emailVerificationToken: {
      create: vi.fn().mockResolvedValue({
        token: 'verify-token',
        userId: 'user-1',
        expiresAt: new Date('2026-03-02T00:00:00Z'),
      }),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    passwordResetToken: {
      create: vi.fn().mockResolvedValue({
        token: 'reset-token',
        userId: 'user-1',
        expiresAt: new Date('2026-03-01T01:00:00Z'),
      }),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    userLoginHistory: {
      create: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn(async (input) => {
      if (typeof input === 'function') {
        return input(tx);
      }

      return Promise.all(input);
    }),
  };

  Object.assign(tx, prisma);
  return prisma;
}

async function loadAuthService(overrides = {}) {
  const prisma = applyOverrides(createPrismaMock(), overrides.prisma || {});
  const bcrypt = {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn().mockResolvedValue(true),
  };
  const tokenService = {
    generateAccessToken: vi.fn().mockReturnValue('access-token'),
    generateRefreshToken: vi.fn().mockReturnValue({
      token: 'refresh-token',
      hash: 'refresh-hash',
      expiresAt: new Date('2027-03-10T00:00:00Z'),
    }),
    hashToken: vi.fn().mockReturnValue('refresh-hash'),
  };
  const mailService = {
    sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  };
  const businessRateLimit = {
    enforceBusinessRateLimit: vi.fn(),
  };
  const emailVerificationWindow = {
    EMAIL_VERIFICATION_GRACE_MS: 7 * 24 * 60 * 60 * 1000,
    isEmailVerificationExpired: vi.fn().mockReturnValue(false),
  };
  const deleteUsersWithRelations = vi.fn().mockResolvedValue(undefined);

  if (overrides.bcrypt) applyOverrides(bcrypt, overrides.bcrypt);
  if (overrides.tokenService) applyOverrides(tokenService, overrides.tokenService);
  if (overrides.mailService) applyOverrides(mailService, overrides.mailService);
  if (overrides.businessRateLimit) applyOverrides(businessRateLimit, overrides.businessRateLimit);
  if (overrides.emailVerificationWindow) {
    applyOverrides(emailVerificationWindow, overrides.emailVerificationWindow);
  }

  const prismaPath = require.resolve(path.resolve(__dirname, '../../src/lib/prisma.js'));
  const bcryptPath = require.resolve('bcryptjs');
  const tokenServicePath = require.resolve(path.resolve(__dirname, '../../src/modules/auth/token.service.js'));
  const mailServicePath = require.resolve(path.resolve(__dirname, '../../src/modules/mail/mail.service.js'));
  const businessRateLimitPath = require.resolve(path.resolve(__dirname, '../../src/lib/businessRateLimit.js'));
  const emailVerificationWindowPath = require.resolve(path.resolve(__dirname, '../../src/lib/emailVerificationWindow.js'));
  const deleteUsersWithRelationsPath = require.resolve(path.resolve(__dirname, '../../src/lib/deleteUsersWithRelations.js'));
  const authServicePath = require.resolve(path.resolve(__dirname, '../../src/modules/auth/auth.service.js'));

  mockCommonJsModule(prismaPath, prisma);
  mockCommonJsModule(bcryptPath, bcrypt);
  mockCommonJsModule(tokenServicePath, tokenService);
  mockCommonJsModule(mailServicePath, mailService);
  mockCommonJsModule(businessRateLimitPath, businessRateLimit);
  mockCommonJsModule(emailVerificationWindowPath, emailVerificationWindow);
  mockCommonJsModule(deleteUsersWithRelationsPath, {
    deleteUsersWithRelations,
  });
  delete require.cache[authServicePath];

  const authService = require(authServicePath);

  return {
    authService,
    mocks: {
      prisma,
      bcrypt,
      tokenService,
      mailService,
      businessRateLimit,
      emailVerificationWindow,
      deleteUsersWithRelations,
    },
  };
}

describe('auth.service', () => {
  it('registers a user successfully', async () => {
    const { authService, mocks } = await loadAuthService();

    const result = await authService.register({
      email: 'user@example.com',
      username: 'user',
      password: 'Password123',
      lang: 'en',
    });

    expect(result.verifyToken).toBe('verify-token');
    expect(mocks.prisma.user.create).toHaveBeenCalled();
    expect(mocks.mailService.sendVerificationEmail).toHaveBeenCalledWith(
      'user@example.com',
      'verify-token',
      'en',
      { userId: 'user-1' },
    );
  });

  it('rejects duplicate email registration', async () => {
    const { authService } = await loadAuthService({
      prisma: {
        user: {
          findFirst: vi.fn().mockResolvedValue({ email: 'user@example.com', username: 'other' }),
        },
      },
    });

    await expect(
      authService.register({ email: 'user@example.com', username: 'user', password: 'Password123' }),
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN', status: 409 });
  });

  it('rejects duplicate username registration', async () => {
    const { authService } = await loadAuthService({
      prisma: {
        user: {
          findFirst: vi.fn().mockResolvedValue({ email: 'other@example.com', username: 'user' }),
        },
      },
    });

    await expect(
      authService.register({ email: 'user@example.com', username: 'user', password: 'Password123' }),
    ).rejects.toMatchObject({ code: 'USERNAME_TAKEN', status: 409 });
  });

  it('does not fail registration when verification mail sending fails', async () => {
    const { authService, mocks } = await loadAuthService({
      mailService: {
        sendVerificationEmail: vi.fn().mockRejectedValue(new Error('smtp failed')),
      },
    });

    await expect(
      authService.register({ email: 'user@example.com', username: 'user', password: 'Password123' }),
    ).resolves.toMatchObject({ verifyToken: 'verify-token' });
    expect(mocks.prisma.user.create).toHaveBeenCalled();
  });

  it('rejects invalid credentials on login', async () => {
    const { authService } = await loadAuthService({
      prisma: {
        user: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            username: 'user',
            passwordHash: 'stored-hash',
            createdAt: new Date('2026-03-01T00:00:00Z'),
          }),
        },
      },
      bcrypt: {
        compare: vi.fn().mockResolvedValue(false),
      },
    });

    await expect(
      authService.login({ login: 'user@example.com', password: 'wrong', ip: '127.0.0.1', userAgent: 'ua' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });
  });

  it('logs in successfully by email', async () => {
    const user = {
      id: 'user-1',
      email: 'user@example.com',
      username: 'user',
      role: 'user',
      passwordHash: 'stored-hash',
      createdAt: new Date('2026-03-01T00:00:00Z'),
    };
    const { authService, mocks } = await loadAuthService({
      prisma: {
        user: {
          findFirst: vi.fn().mockResolvedValue(user),
        },
      },
    });

    const result = await authService.login({
      login: 'user@example.com',
      password: 'Password123',
      ip: '127.0.0.1',
      userAgent: 'ua',
    });

    expect(result).toMatchObject({
      user,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(mocks.prisma.refreshToken.create).toHaveBeenCalled();
  });

  it('logs in successfully by username', async () => {
    const user = {
      id: 'user-1',
      email: 'user@example.com',
      username: 'player_one',
      role: 'user',
      passwordHash: 'stored-hash',
      createdAt: new Date('2026-03-01T00:00:00Z'),
    };
    const { authService } = await loadAuthService({
      prisma: {
        user: {
          findFirst: vi.fn().mockResolvedValue(user),
        },
      },
    });

    await expect(
      authService.login({
        login: 'player_one',
        password: 'Password123',
        ip: '127.0.0.1',
        userAgent: 'ua',
      }),
    ).resolves.toMatchObject({ accessToken: 'access-token' });
  });

  it('cleans up expired unverified users on login', async () => {
    const user = {
      id: 'user-1',
      email: 'user@example.com',
      username: 'user',
      passwordHash: 'stored-hash',
      createdAt: new Date('2026-02-01T00:00:00Z'),
    };
    const { authService, mocks } = await loadAuthService({
      prisma: {
        user: {
          findFirst: vi.fn().mockResolvedValue(user),
        },
      },
      emailVerificationWindow: {
        isEmailVerificationExpired: vi.fn().mockReturnValue(true),
      },
    });

    await expect(
      authService.login({ login: 'user@example.com', password: 'Password123', ip: '127.0.0.1', userAgent: 'ua' }),
    ).rejects.toMatchObject({ code: 'EMAIL_VERIFICATION_EXPIRED', status: 403 });
    expect(mocks.deleteUsersWithRelations).toHaveBeenCalled();
  });

  it('rejects refresh for invalid or revoked tokens', async () => {
    const { authService } = await loadAuthService({
      prisma: {
        refreshToken: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    });

    await expect(authService.refresh('bad-token', '127.0.0.1', 'ua')).rejects.toMatchObject({
      code: 'TOKEN_INVALID',
      status: 401,
    });
  });

  it('rejects refresh for expired tokens', async () => {
    const { authService } = await loadAuthService({
      prisma: {
        refreshToken: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'rt-1',
            userId: 'user-1',
            expiresAt: new Date('2026-01-01T00:00:00Z'),
          }),
        },
      },
    });

    await expect(authService.refresh('expired-token', '127.0.0.1', 'ua')).rejects.toMatchObject({
      code: 'TOKEN_INVALID',
      status: 401,
    });
  });

  it('rotates refresh token successfully', async () => {
    const { authService, mocks } = await loadAuthService({
      prisma: {
        refreshToken: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'rt-1',
            userId: 'user-1',
            expiresAt: new Date('2027-03-10T00:00:00Z'),
          }),
        },
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'user-1',
            role: 'user',
            createdAt: new Date('2026-03-01T00:00:00Z'),
          }),
        },
      },
    });

    const result = await authService.refresh('refresh-token', '127.0.0.1', 'ua');

    expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
    expect(mocks.prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'rt-1' },
      data: { revokedAt: expect.any(Date) },
    });
    expect(mocks.prisma.refreshToken.create).toHaveBeenCalled();
  });

  it('verifies email successfully', async () => {
    const { authService, mocks } = await loadAuthService({
      prisma: {
        emailVerificationToken: {
          findUnique: vi.fn().mockResolvedValue({
            token: 'verify-token',
            userId: 'user-1',
            expiresAt: new Date('2027-03-10T00:00:00Z'),
            usedAt: null,
          }),
        },
        user: {
          findUnique: vi.fn().mockResolvedValue({ id: 'user-1', emailVerified: false }),
        },
      },
    });

    await expect(authService.verifyEmail('verify-token')).resolves.toEqual({ message: 'Email verified' });
    expect(mocks.prisma.emailVerificationToken.update).toHaveBeenCalled();
    expect(mocks.prisma.user.update).toHaveBeenCalled();
  });

  it('rejects verify email when token is not found', async () => {
    const { authService } = await loadAuthService();

    await expect(authService.verifyEmail('missing-token')).rejects.toMatchObject({
      code: 'TOKEN_INVALID',
      status: 400,
    });
  });

  it('rejects verify email when token is expired', async () => {
    const { authService } = await loadAuthService({
      prisma: {
        emailVerificationToken: {
          findUnique: vi.fn().mockResolvedValue({
            token: 'verify-token',
            userId: 'user-1',
            expiresAt: new Date('2026-01-01T00:00:00Z'),
            usedAt: null,
          }),
        },
      },
    });

    await expect(authService.verifyEmail('verify-token')).rejects.toMatchObject({
      code: 'TOKEN_INVALID',
      status: 400,
    });
  });

  it('returns already verified message when token was already used', async () => {
    const { authService } = await loadAuthService({
      prisma: {
        emailVerificationToken: {
          findUnique: vi.fn().mockResolvedValue({
            token: 'verify-token',
            userId: 'user-1',
            expiresAt: new Date('2027-03-10T00:00:00Z'),
            usedAt: new Date('2026-03-01T00:00:00Z'),
          }),
        },
        user: {
          findUnique: vi.fn().mockResolvedValue({ id: 'user-1', emailVerified: true }),
        },
      },
    });

    await expect(authService.verifyEmail('verify-token')).resolves.toEqual({
      message: 'Email already verified',
    });
  });

  it('does not disclose unknown emails in forgot password', async () => {
    const { authService, mocks } = await loadAuthService();

    await expect(authService.forgotPassword('missing@example.com')).resolves.toBeUndefined();
    expect(mocks.prisma.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it('bubbles business rate limit errors from forgot password', async () => {
    const rateLimitError = Object.assign(new Error('BUSINESS_RATE_LIMIT'), {
      code: 'BUSINESS_RATE_LIMIT',
      status: 429,
    });
    const { authService } = await loadAuthService({
      prisma: {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            profile: { preferredLanguage: 'en' },
          }),
        },
      },
      businessRateLimit: {
        enforceBusinessRateLimit: vi.fn(() => {
          throw rateLimitError;
        }),
      },
    });

    await expect(authService.forgotPassword('user@example.com')).rejects.toMatchObject({
      code: 'BUSINESS_RATE_LIMIT',
      status: 429,
    });
  });

  it('creates a new reset token in forgot password flow', async () => {
    const { authService, mocks } = await loadAuthService({
      prisma: {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            profile: { preferredLanguage: 'en' },
          }),
        },
      },
    });

    const result = await authService.forgotPassword('user@example.com');

    expect(result.resetToken).toBe('reset-token');
    expect(mocks.prisma.passwordResetToken.updateMany).toHaveBeenCalled();
    expect(mocks.prisma.passwordResetToken.create).toHaveBeenCalled();
  });

  it('rejects reset password for invalid, used or expired token', async () => {
    const { authService } = await loadAuthService({
      prisma: {
        passwordResetToken: {
          findUnique: vi.fn().mockResolvedValue({
            token: 'reset-token',
            userId: 'user-1',
            usedAt: new Date('2026-03-01T00:00:00Z'),
            expiresAt: new Date('2026-03-10T00:00:00Z'),
          }),
        },
      },
    });

    await expect(authService.resetPassword('reset-token', 'NextPass123')).rejects.toMatchObject({
      code: 'TOKEN_EXPIRED',
      status: 400,
    });
  });

  it('resets password successfully', async () => {
    const { authService, mocks } = await loadAuthService({
      prisma: {
        passwordResetToken: {
          findUnique: vi.fn().mockResolvedValue({
            token: 'reset-token',
            userId: 'user-1',
            usedAt: null,
            expiresAt: new Date('2027-03-10T00:00:00Z'),
          }),
        },
      },
    });

    await expect(authService.resetPassword('reset-token', 'NextPass123')).resolves.toBeUndefined();
    expect(mocks.prisma.user.update).toHaveBeenCalled();
    expect(mocks.prisma.passwordResetToken.update).toHaveBeenCalled();
  });

  it('rejects resend verification for already verified users', async () => {
    const { authService } = await loadAuthService({
      prisma: {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            emailVerified: true,
            createdAt: new Date('2026-03-01T00:00:00Z'),
            profile: { preferredLanguage: 'en' },
          }),
        },
      },
    });

    await expect(authService.resendVerification('user-1')).rejects.toMatchObject({
      code: 'EMAIL_ALREADY_VERIFIED',
      status: 400,
    });
  });

  it('bubbles rate limit errors from resend verification', async () => {
    const rateLimitError = Object.assign(new Error('BUSINESS_RATE_LIMIT'), {
      code: 'BUSINESS_RATE_LIMIT',
      status: 429,
    });
    const { authService } = await loadAuthService({
      prisma: {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            emailVerified: false,
            createdAt: new Date('2026-03-01T00:00:00Z'),
            profile: { preferredLanguage: 'en' },
          }),
        },
      },
      businessRateLimit: {
        enforceBusinessRateLimit: vi.fn(() => {
          throw rateLimitError;
        }),
      },
    });

    await expect(authService.resendVerification('user-1')).rejects.toMatchObject({
      code: 'BUSINESS_RATE_LIMIT',
      status: 429,
    });
  });

  it('cleans up expired users during resend verification', async () => {
    const { authService, mocks } = await loadAuthService({
      prisma: {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            emailVerified: false,
            createdAt: new Date('2026-02-01T00:00:00Z'),
            profile: { preferredLanguage: 'en' },
          }),
        },
      },
      emailVerificationWindow: {
        isEmailVerificationExpired: vi.fn().mockReturnValue(true),
      },
    });

    await expect(authService.resendVerification('user-1')).rejects.toMatchObject({
      code: 'EMAIL_VERIFICATION_EXPIRED',
      status: 403,
    });
    expect(mocks.deleteUsersWithRelations).toHaveBeenCalled();
  });

  it('resends verification successfully', async () => {
    const { authService, mocks } = await loadAuthService({
      prisma: {
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            emailVerified: false,
            createdAt: new Date('2026-03-01T00:00:00Z'),
            profile: { preferredLanguage: 'en' },
          }),
        },
      },
    });

    await expect(authService.resendVerification('user-1')).resolves.toEqual({
      message: 'Verification email sent',
    });
    expect(mocks.prisma.emailVerificationToken.updateMany).toHaveBeenCalled();
    expect(mocks.prisma.emailVerificationToken.create).toHaveBeenCalled();
    expect(mocks.mailService.sendVerificationEmail).toHaveBeenCalled();
  });
});
