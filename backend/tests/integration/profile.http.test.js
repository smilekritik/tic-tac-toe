const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/lib/prisma');
const { createVerifiedUser } = require('../helpers/db');
const { registerIntegrationHooks } = require('../helpers/integration-hooks');

registerIntegrationHooks();

describe('profile HTTP integration', () => {
  it('returns public profile for public users', async () => {
    await createVerifiedUser(prisma, {
      email: 'user@example.com',
      username: 'player',
      password: 'Password123',
      publicProfileEnabled: true,
    });

    const response = await request(app).get('/api/users/player');

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

    const response = await request(app).get('/api/users/player');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('PROFILE_PRIVATE');
  });
});
