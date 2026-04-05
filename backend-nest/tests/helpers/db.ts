import bcrypt from 'bcryptjs';
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
