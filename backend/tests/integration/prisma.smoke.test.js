const prisma = require('../../src/lib/prisma');
const { createVerifiedUser, resetDb, seedGameModes } = require('../helpers/db');
const { registerIntegrationHooks } = require('../helpers/integration-hooks');

registerIntegrationHooks();

describe('prisma integration smoke', () => {
  it('has applied migrations', async () => {
    const rows = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "_prisma_migrations"');

    expect(rows[0].count).toBeGreaterThan(0);
  });

  it('creates entities and resetDb clears them', async () => {
    await createVerifiedUser(prisma, {
      email: 'user@example.com',
      username: 'player',
      password: 'Password123',
    });

    expect(await prisma.user.count()).toBe(1);

    await resetDb(prisma);
    await seedGameModes(prisma);

    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.gameMode.count()).toBe(3);
  });
});
