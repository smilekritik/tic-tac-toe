import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp } from '../helpers/app';
import { createVerifiedUser, resetDb, seedGameModes } from '../helpers/db';

const describeDb = process.env.RUN_DB_E2E === 'true' ? describe : describe.skip;

describeDb('prisma integration smoke', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const boot = await createTestApp();
    app = boot.app;
    prisma = boot.prisma;
  });

  beforeEach(async () => {
    await resetDb(prisma);
    await seedGameModes(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('has applied migrations', async () => {
    const rows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
      'SELECT COUNT(*)::int AS count FROM "_prisma_migrations"',
    );
    expect(rows[0]?.count).toBeGreaterThan(0);
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
