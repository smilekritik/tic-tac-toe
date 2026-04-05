import { AuthService } from '../../src/auth/auth.service';
import { AppError } from '../../src/common/errors/app-error';

function createLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function createAuthService(overrides: {
  prisma?: Record<string, unknown>;
  tokenService?: Record<string, unknown>;
  mailService?: Record<string, unknown>;
  businessRateLimit?: Record<string, unknown>;
  bcryptRounds?: number;
} = {}) {
  const authLogger = createLogger();
  const prisma: Record<string, any> = {
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
    $transaction: vi.fn(async (input: unknown) => {
      if (typeof input === 'function') {
        return input(prisma as never);
      }

      return Promise.all(input as Array<Promise<unknown>>);
    }),
    ...overrides.prisma,
  };

  const service = new AuthService(
    prisma as never,
    {
      getLogger: vi.fn().mockReturnValue(authLogger),
    } as never,
    {
      generateAccessToken: vi.fn().mockReturnValue('access-token'),
      generateRefreshToken: vi.fn().mockReturnValue({
        token: 'refresh-token',
        hash: 'refresh-hash',
        expiresAt: new Date('2027-03-10T00:00:00Z'),
      }),
      hashToken: vi.fn().mockReturnValue('refresh-hash'),
      ...overrides.tokenService,
    } as never,
    {
      sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
      ...overrides.mailService,
    } as never,
    {
      security: {
        bcryptRounds: overrides.bcryptRounds || 4,
      },
    } as never,
    {
      enforce: vi.fn(),
      ...overrides.businessRateLimit,
    } as never,
  );

  return { service, prisma, authLogger };
}

describe('auth service', () => {
  it('registers a user successfully', async () => {
    const { service, prisma } = createAuthService();

    const result = await service.register({
      email: 'user@example.com',
      username: 'user',
      password: 'Password123',
      lang: 'en',
    });

    expect(result.verifyToken).toBe('verify-token');
    expect(prisma.user.create).toHaveBeenCalled();
    expect(prisma.emailVerificationToken.create).toHaveBeenCalled();
  });

  it('rejects duplicate email registration', async () => {
    const { service } = createAuthService({
      prisma: {
        user: {
          findMany: vi.fn().mockResolvedValue([]),
          findFirst: vi.fn().mockResolvedValue({
            email: 'user@example.com',
            username: 'other',
          }),
        },
      },
    });

    await expect(
      service.register({ email: 'user@example.com', username: 'user', password: 'Password123' }),
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN', status: 409 });
  });

  it('rejects invalid credentials on login', async () => {
    const { service } = createAuthService({
      prisma: {
        user: {
          findMany: vi.fn().mockResolvedValue([]),
          findFirst: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            username: 'user',
            passwordHash: 'stored-hash',
            createdAt: new Date(),
          }),
        },
      },
    });

    await expect(
      service.login({ login: 'user@example.com', password: 'wrong', ip: '127.0.0.1', userAgent: 'ua' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });
  });

  it('rotates refresh token successfully', async () => {
    const { service, prisma } = createAuthService({
      prisma: {
        refreshToken: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'rt-1',
            userId: 'user-1',
            expiresAt: new Date('2027-03-10T00:00:00Z'),
          }),
          update: vi.fn().mockResolvedValue({}),
          create: vi.fn().mockResolvedValue({}),
        },
        user: {
          findMany: vi.fn().mockResolvedValue([]),
          findUnique: vi.fn().mockResolvedValue({
            id: 'user-1',
            role: 'user',
            emailVerified: true,
            createdAt: new Date(),
          }),
        },
      },
    });

    const result = await service.refresh('refresh-token', '127.0.0.1', 'ua');
    expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
    expect(prisma.refreshToken.update).toHaveBeenCalled();
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  });

  it('does not disclose unknown emails in forgot password', async () => {
    const { service, prisma } = createAuthService();

    await expect(service.forgotPassword('missing@example.com')).resolves.toBeUndefined();
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it('rejects resend verification for already verified users', async () => {
    const { service } = createAuthService({
      prisma: {
        user: {
          findMany: vi.fn().mockResolvedValue([]),
          findUnique: vi.fn().mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            emailVerified: true,
            createdAt: new Date(),
            profile: { preferredLanguage: 'en' },
          }),
        },
      },
    });

    await expect(service.resendVerification('user-1')).rejects.toMatchObject({
      code: 'EMAIL_ALREADY_VERIFIED',
      status: 400,
    } satisfies Partial<AppError>);
  });
});
