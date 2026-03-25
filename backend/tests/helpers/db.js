const bcrypt = require('bcryptjs');
const request = require('supertest');

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

async function resetDb(prisma) {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TRUNCATE_TABLES.map((table) => `"${table}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
}

async function seedGameModes(prisma) {
  for (const mode of GAME_MODES) {
    await prisma.gameMode.upsert({
      where: { code: mode.code },
      update: {},
      create: mode,
    });
  }
}

async function createUser(
  prisma,
  {
    email = 'user@example.com',
    username = 'user',
    password = 'Password123',
    emailVerified = false,
    preferredLanguage = 'en',
    publicProfileEnabled = true,
    chatEnabledDefault = true,
    role = 'user',
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

async function createVerifiedUser(prisma, input = {}) {
  return createUser(prisma, { ...input, emailVerified: true });
}

async function loginAndGetTokens(app, { login, password = 'Password123', userAgent = 'test-agent' }) {
  const response = await request(app)
    .post('/api/auth/login')
    .set('User-Agent', userAgent)
    .send({ login, password });

  return {
    response,
    accessToken: response.body.accessToken,
    cookies: response.headers['set-cookie'] || [],
    cookieHeader: (response.headers['set-cookie'] || []).map((cookie) => cookie.split(';')[0]).join('; '),
  };
}

function createAuthHeaders(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
}

function createPngBuffer() {
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

module.exports = {
  createAuthHeaders,
  createPngBuffer,
  createUser,
  createVerifiedUser,
  loginAndGetTokens,
  resetDb,
  seedGameModes,
};
