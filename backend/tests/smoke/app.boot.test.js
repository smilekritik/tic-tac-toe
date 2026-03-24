const request = require('supertest');
const app = require('../../src/app');

describe('app smoke', () => {
  it('loads the app and answers on /health', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
