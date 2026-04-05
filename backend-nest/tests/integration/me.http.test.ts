import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp } from '../helpers/app';
import {
  createAuthHeaders,
  createPngBuffer,
  createVerifiedUser,
  loginAndGetTokens,
  resetDb,
  seedGameModes,
} from '../helpers/db';

const describeDb = process.env.RUN_DB_E2E === 'true' ? describe : describe.skip;

describeDb('me HTTP integration', () => {
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

  it('returns 401 on GET /api/me without token', async () => {
    const response = await request(app.getHttpServer()).get('/api/me');
    expect(response.status).toBe(401);
  });

  it('returns 200 on GET /api/me with token', async () => {
    await createVerifiedUser(prisma, {
      email: 'user@example.com',
      username: 'player',
      password: 'Password123',
    });
    const login = await loginAndGetTokens(app, {
      login: 'user@example.com',
      password: 'Password123',
    });

    const response = await request(app.getHttpServer())
      .get('/api/me')
      .set(createAuthHeaders(login.accessToken));

    expect(response.status).toBe(200);
    expect(response.body.email).toBe('user@example.com');
  });

  it('checks username availability', async () => {
    const first = await createVerifiedUser(prisma, {
      email: 'first@example.com',
      username: 'first',
      password: 'Password123',
    });
    await createVerifiedUser(prisma, {
      email: 'taken@example.com',
      username: 'taken',
      password: 'Password123',
    });
    const login = await loginAndGetTokens(app, {
      login: first.email,
      password: 'Password123',
    });

    const response = await request(app.getHttpServer())
      .get('/api/me/username-availability')
      .set(createAuthHeaders(login.accessToken))
      .query({ username: 'taken' });

    expect(response.status).toBe(200);
    expect(response.body.available).toBe(false);
  });

  it('updates settings with valid input', async () => {
    const user = await createVerifiedUser(prisma, {
      email: 'user@example.com',
      username: 'player',
      password: 'Password123',
    });
    const login = await loginAndGetTokens(app, {
      login: user.email,
      password: 'Password123',
    });

    const response = await request(app.getHttpServer())
      .patch('/api/me/settings')
      .set(createAuthHeaders(login.accessToken))
      .send({
        preferredLanguage: 'pl',
        chatEnabledDefault: false,
        publicProfileEnabled: false,
      });

    expect(response.status).toBe(200);
    expect(response.body.profile.preferredLanguage).toBe('pl');
    expect(response.body.profile.chatEnabledDefault).toBe(false);
    expect(response.body.profile.publicProfileEnabled).toBe(false);
  });

  it('uploads avatar successfully', async () => {
    const user = await createVerifiedUser(prisma, {
      email: 'user@example.com',
      username: 'player',
      password: 'Password123',
    });
    const login = await loginAndGetTokens(app, {
      login: user.email,
      password: 'Password123',
    });

    const response = await request(app.getHttpServer())
      .post('/api/me/avatar')
      .set(createAuthHeaders(login.accessToken))
      .attach('avatar', createPngBuffer(), 'avatar.png');

    expect(response.status).toBe(201);
    expect(response.body.avatarPath).toMatch(/^\/uploads\/[a-f0-9]{32}\.(jpg|png|webp)$/);
  });
});
