import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../helpers/app';
import { createVerifiedUser, loginAndGetTokens, resetDb, seedGameModes } from '../helpers/db';
import { PrismaService } from '../../src/prisma/prisma.service';

const describeDb = process.env.RUN_DB_E2E === 'true' ? describe : describe.skip;

describeDb('auth HTTP integration', () => {
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

  it('registers a user successfully', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/registration')
      .send({
        email: 'user@example.com',
        username: 'user',
        password: 'Password123',
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toMatch(/Registered/);

    const user = await prisma.user.findUnique({
      where: { email: 'user@example.com' },
      include: { profile: true },
    });
    expect(user).toBeTruthy();
    expect(user?.profile).toBeTruthy();
  });

  it('rejects duplicate email registration', async () => {
    await createVerifiedUser(prisma, { email: 'user@example.com', username: 'first' });

    const response = await request(app.getHttpServer())
      .post('/api/auth/registration')
      .send({
        email: 'user@example.com',
        username: 'second',
        password: 'Password123',
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('logs in successfully', async () => {
    await createVerifiedUser(prisma, {
      email: 'user@example.com',
      username: 'player',
      password: 'Password123',
    });

    const response = await request(app.getHttpServer()).post('/api/auth/login').send({
      login: 'user@example.com',
      password: 'Password123',
    });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeTruthy();
    expect(response.headers['set-cookie']).toBeTruthy();
  });

  it('rejects invalid credentials', async () => {
    await createVerifiedUser(prisma, {
      email: 'user@example.com',
      username: 'player',
      password: 'Password123',
    });

    const response = await request(app.getHttpServer()).post('/api/auth/login').send({
      login: 'user@example.com',
      password: 'WrongPassword123',
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('refreshes tokens successfully using cookie', async () => {
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
      .get('/api/auth/refresh')
      .set('Cookie', login.cookieHeader);

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeTruthy();
    expect(response.headers['set-cookie']).toBeTruthy();
  });

  it('logs out and clears refresh cookie', async () => {
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
      .post('/api/auth/logout')
      .set('Cookie', login.cookieHeader);
    const cookies = Array.isArray(response.headers['set-cookie'])
      ? response.headers['set-cookie']
      : response.headers['set-cookie']
        ? [response.headers['set-cookie']]
        : [];

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Logged out');
    expect(cookies.join(';')).toContain('refreshToken=;');
  });
});
