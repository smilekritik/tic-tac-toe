import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { PrismaService } from '../../src/prisma/prisma.service';

const GAME_MODES = [
  { code: 'classic', name: 'Classic 3x3', isRanked: true, isEnabled: true },
  { code: 'casual', name: 'Casual', isRanked: false, isEnabled: true },
  { code: 'moving-window', name: 'Moving Window', isRanked: true, isEnabled: true },
];

const TRUNCATE_TABLES = [
  'admin_logs',
  'match_moves',
  'matches',
  'user_bans',
  'user_ratings',
  'invites',
  'refresh_tokens',
  'email_verification_tokens',
  'password_reset_tokens',
  'user_email_changes',
  'user_login_history',
  'user_profiles',
  'users',
  'game_modes',
];

export async function resetDb(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TRUNCATE_TABLES.map((table) => `"${table}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
}

export async function seedGameModes(prisma: PrismaService): Promise<void> {
  for (const mode of GAME_MODES) {
    await prisma.gameMode.upsert({
      where: { code: mode.code },
      update: {},
      create: mode,
    });
  }
}

export async function createUser(
  prisma: PrismaService,
  {
    email = 'user@example.com',
    username = 'user',
    password = 'Password123',
    emailVerified = false,
    preferredLanguage = 'en',
    publicProfileEnabled = true,
    chatEnabledDefault = true,
    role = 'user',
  }: {
    email?: string;
    username?: string;
    password?: string;
    emailVerified?: boolean;
    preferredLanguage?: string;
    publicProfileEnabled?: boolean;
    chatEnabledDefault?: boolean;
    role?: 'user' | 'admin' | 'superadmin';
  } = {},
) {
  const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS || 4));

  return prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      emailVerified,
      role,
      profile: {
        create: {
          preferredLanguage,
          publicProfileEnabled,
          chatEnabledDefault,
        },
      },
    },
    include: { profile: true },
  });
}

export async function createVerifiedUser(
  prisma: PrismaService,
  input: Parameters<typeof createUser>[1] = {},
) {
  return createUser(prisma, { ...input, emailVerified: true });
}

export async function loginAndGetTokens(
  app: { getHttpServer: () => Parameters<typeof request>[0] },
  {
    login,
    password = 'Password123',
    userAgent = 'test-agent',
  }: {
    login: string;
    password?: string;
    userAgent?: string;
  },
) {
  const response = await request(app.getHttpServer())
    .post('/api/auth/login')
    .set('User-Agent', userAgent)
    .send({ login, password });

  return {
    response,
    accessToken: response.body.accessToken as string,
    cookies: (response.headers['set-cookie'] || []) as string[],
    cookieHeader: ((response.headers['set-cookie'] || []) as string[])
      .map((cookie) => cookie.split(';')[0])
      .join('; '),
  };
}

export function createAuthHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

export function createPngBuffer(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xde, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9c, 0x63, 0x60, 0x00, 0x00, 0x00,
    0x02, 0x00, 0x01, 0xe5, 0x27, 0xd4, 0xa2, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82,
  ]);
}
