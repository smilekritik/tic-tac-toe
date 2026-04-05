import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp } from '../helpers/app';
import { createVerifiedUser, resetDb, seedGameModes } from '../helpers/db';

const describeDb = process.env.RUN_DB_E2E === 'true' ? describe : describe.skip;

describeDb('profile HTTP integration', () => {
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

  it('returns public profile for public users', async () => {
    await createVerifiedUser(prisma, {
      email: 'user@example.com',
      username: 'player',
      password: 'Password123',
      publicProfileEnabled: true,
    });

    const response = await request(app.getHttpServer()).get('/api/users/player');

    expect(response.status).toBe(200);
    expect(response.body.username).toBe('player');
  });

  it('hides private profile from non-owners', async () => {
    await createVerifiedUser(prisma, {
      email: 'user@example.com',
      username: 'player',
      password: 'Password123',
      publicProfileEnabled: false,
    });

    const response = await request(app.getHttpServer()).get('/api/users/player');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('PROFILE_PRIVATE');
  });
});
