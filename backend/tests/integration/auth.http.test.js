const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/lib/prisma');
const {
  createVerifiedUser,
  loginAndGetTokens,
} = require('../helpers/db');
const { registerIntegrationHooks } = require('../helpers/integration-hooks');

registerIntegrationHooks();

describe('auth HTTP integration', () => {
  it('registers a user successfully', async () => {
    const response = await request(app)
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
    expect(user.profile).toBeTruthy();
  });

  it('rejects duplicate email registration', async () => {
    await createVerifiedUser(prisma, { email: 'user@example.com', username: 'first' });

    const response = await request(app)
      .post('/api/auth/registration')
      .send({
        email: 'user@example.com',
        username: 'second',
        password: 'Password123',
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('rejects duplicate username registration', async () => {
    await createVerifiedUser(prisma, { email: 'first@example.com', username: 'player' });

    const response = await request(app)
      .post('/api/auth/registration')
      .send({
        email: 'second@example.com',
        username: 'player',
        password: 'Password123',
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('USERNAME_TAKEN');
  });

  it('logs in successfully', async () => {
    await createVerifiedUser(prisma, {
      email: 'user@example.com',
      username: 'player',
      password: 'Password123',
    });

    const response = await request(app).post('/api/auth/login').send({
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

    const response = await request(app).post('/api/auth/login').send({
      login: 'user@example.com',
      password: 'Wrong1234',
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rotates refresh token on refresh', async () => {
    await createVerifiedUser(prisma, {
      email: 'user@example.com',
      username: 'player',
      password: 'Password123',
    });

    const login = await loginAndGetTokens(app, {
      login: 'user@example.com',
      password: 'Password123',
    });
    const previousCookie = login.cookieHeader;

    const refreshResponse = await request(app)
      .get('/api/auth/refresh')
      .set('Cookie', previousCookie);

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.accessToken).toBeTruthy();

    const tokens = await prisma.refreshToken.findMany();
    expect(tokens).toHaveLength(2);
    expect(tokens.filter((token) => token.revokedAt)).toHaveLength(1);
  });

  it('revokes refresh token on logout', async () => {
    await createVerifiedUser(prisma, {
      email: 'user@example.com',
      username: 'player',
      password: 'Password123',
    });

    const login = await loginAndGetTokens(app, {
      login: 'user@example.com',
      password: 'Password123',
    });

    const logoutResponse = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', login.cookieHeader);

    expect(logoutResponse.status).toBe(200);

    const refreshRecord = await prisma.refreshToken.findFirst();
    expect(refreshRecord.revokedAt).toBeTruthy();
  });

  it('verifies email with a valid token', async () => {
    const user = await createVerifiedUser(prisma, {
      email: 'user@example.com',
      username: 'player',
      password: 'Password123',
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: false },
    });
    const record = await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: 'verify-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const response = await request(app).get(`/api/auth/activate/${record.token}`);

    expect(response.status).toBe(200);

    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updatedUser.emailVerified).toBe(true);
  });

  it('rejects reset password for invalid token', async () => {
    const response = await request(app).post('/api/auth/reset-password').send({
      token: 'missing-token',
      password: 'NextPass123',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('rejects reset password for used token', async () => {
    const user = await createVerifiedUser(prisma, {
      email: 'user@example.com',
      username: 'player',
      password: 'Password123',
    });
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: 'used-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        usedAt: new Date(),
      },
    });

    const response = await request(app).post('/api/auth/reset-password').send({
      token: 'used-token',
      password: 'NextPass123',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('TOKEN_EXPIRED');
  });
});
