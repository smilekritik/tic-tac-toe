const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/lib/prisma');
const {
  createAuthHeaders,
  createPngBuffer,
  createVerifiedUser,
  loginAndGetTokens,
} = require('../helpers/db');
const { registerIntegrationHooks } = require('../helpers/integration-hooks');

registerIntegrationHooks();

describe('me HTTP integration', () => {
  it('returns 401 on GET /api/me without token', async () => {
    const response = await request(app).get('/api/me');

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

    const response = await request(app)
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

    const response = await request(app)
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

    const response = await request(app)
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

  it('rejects invalid settings payload', async () => {
    const user = await createVerifiedUser(prisma, {
      email: 'user@example.com',
      username: 'player',
      password: 'Password123',
    });
    const login = await loginAndGetTokens(app, {
      login: user.email,
      password: 'Password123',
    });

    const response = await request(app)
      .patch('/api/me/settings')
      .set(createAuthHeaders(login.accessToken))
      .send({
        preferredLanguage: 'de',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('revokes refresh tokens after password change', async () => {
    const user = await createVerifiedUser(prisma, {
      email: 'user@example.com',
      username: 'player',
      password: 'Password123',
    });
    const login = await loginAndGetTokens(app, {
      login: user.email,
      password: 'Password123',
    });

    const response = await request(app)
      .patch('/api/me/password')
      .set(createAuthHeaders(login.accessToken))
      .send({
        currentPassword: 'Password123',
        newPassword: 'NextPass123',
      });

    expect(response.status).toBe(200);

    const refreshTokens = await prisma.refreshToken.findMany({
      where: { userId: user.id },
    });
    expect(refreshTokens.every((token) => token.revokedAt)).toBe(true);
  });

  it('confirms email change with a valid token', async () => {
    const user = await createVerifiedUser(prisma, {
      email: 'user@example.com',
      username: 'player',
      password: 'Password123',
    });
    const login = await loginAndGetTokens(app, {
      login: user.email,
      password: 'Password123',
    });

    const requestResponse = await request(app)
      .patch('/api/me/email')
      .set(createAuthHeaders(login.accessToken))
      .send({
        email: 'next@example.com',
      });

    expect(requestResponse.status).toBe(200);

    const changeRecord = await prisma.userEmailChange.findFirst({
      where: { userId: user.id, newEmail: 'next@example.com' },
      orderBy: { expiresAt: 'desc' },
    });

    const confirmResponse = await request(app)
      .get(`/api/me/email/confirm/${changeRecord.token}`);

    expect(confirmResponse.status).toBe(200);

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    const updatedChangeRecord = await prisma.userEmailChange.findUnique({
      where: { token: changeRecord.token },
    });
    const refreshTokens = await prisma.refreshToken.findMany({
      where: { userId: user.id },
    });

    expect(updatedUser.email).toBe('next@example.com');
    expect(updatedChangeRecord.confirmedAt).toBeTruthy();
    expect(refreshTokens.every((token) => token.revokedAt)).toBe(true);
  });

  it('rejects expired email change token', async () => {
    const user = await createVerifiedUser(prisma, {
      email: 'user@example.com',
      username: 'player',
      password: 'Password123',
    });

    await prisma.userEmailChange.create({
      data: {
        userId: user.id,
        newEmail: 'expired@example.com',
        token: 'expired-email-change-token',
        expiresAt: new Date(Date.now() - 60 * 1000),
      },
    });

    const response = await request(app)
      .get('/api/me/email/confirm/expired-email-change-token');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('accepts valid avatar upload', async () => {
    const user = await createVerifiedUser(prisma, {
      email: 'user@example.com',
      username: 'player',
      password: 'Password123',
    });
    const login = await loginAndGetTokens(app, {
      login: user.email,
      password: 'Password123',
    });

    const response = await request(app)
      .post('/api/me/avatar')
      .set(createAuthHeaders(login.accessToken))
      .attach('avatar', createPngBuffer(), {
        filename: 'avatar.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(200);
    expect(response.body.avatarPath).toMatch(/^\/uploads\//);
  });

  it('rejects invalid avatar content', async () => {
    const user = await createVerifiedUser(prisma, {
      email: 'user@example.com',
      username: 'player',
      password: 'Password123',
    });
    const login = await loginAndGetTokens(app, {
      login: user.email,
      password: 'Password123',
    });

    const response = await request(app)
      .post('/api/me/avatar')
      .set(createAuthHeaders(login.accessToken))
      .attach('avatar', Buffer.from('not-an-image'), {
        filename: 'avatar.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  it('deletes previous avatar file on update', async () => {
    const user = await createVerifiedUser(prisma, {
      email: 'user@example.com',
      username: 'player',
      password: 'Password123',
    });
    const login = await loginAndGetTokens(app, {
      login: user.email,
      password: 'Password123',
    });

    const firstUpload = await request(app)
      .post('/api/me/avatar')
      .set(createAuthHeaders(login.accessToken))
      .attach('avatar', createPngBuffer(), {
        filename: 'avatar1.png',
        contentType: 'image/png',
      });

    const secondUpload = await request(app)
      .post('/api/me/avatar')
      .set(createAuthHeaders(login.accessToken))
      .attach('avatar', createPngBuffer(), {
        filename: 'avatar2.png',
        contentType: 'image/png',
      });

    const firstFile = path.resolve(process.cwd(), process.env.UPLOAD_PATH, firstUpload.body.avatarPath.split('/').pop());
    const secondFile = path.resolve(process.cwd(), process.env.UPLOAD_PATH, secondUpload.body.avatarPath.split('/').pop());

    expect(firstUpload.status).toBe(200);
    expect(secondUpload.status).toBe(200);
    expect(fs.existsSync(firstFile)).toBe(false);
    expect(fs.existsSync(secondFile)).toBe(true);
  });

  it('does not allow traversal through uploads route', async () => {
    const response = await request(app).get('/uploads/..%2F..%2Fpackage.json');

    expect(response.status).toBe(404);
  });
});
