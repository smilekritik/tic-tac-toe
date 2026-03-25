const express = require('express');
const request = require('supertest');
const path = require('path');

function mockCommonJsModule(modulePath, exportsValue) {
  delete require.cache[modulePath];
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports: exportsValue,
  };
}

function loadRateLimitMiddleware(securityOverrides = {}) {
  const env = {
    security: {
      httpRateLimitWindowMs: 60 * 1000,
      httpRateLimitMax: 1,
      authRateLimitWindowMs: 60 * 1000,
      authRateLimitMax: 1,
      loginRateLimitWindowMs: 60 * 1000,
      loginRateLimitMax: 1,
      uploadRateLimitWindowMs: 60 * 1000,
      uploadRateLimitMax: 1,
      ...securityOverrides,
    },
  };
  const logger = {
    getLogger: vi.fn(() => ({
      warn: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    })),
    withRequestContext: vi.fn((_context, fn) => fn()),
  };

  const envPath = require.resolve(path.resolve(__dirname, '../../../src/config/env.js'));
  const loggerPath = require.resolve(path.resolve(__dirname, '../../../src/lib/logger.js'));
  const middlewarePath = require.resolve(path.resolve(__dirname, '../../../src/middlewares/rateLimit.middleware.js'));

  mockCommonJsModule(envPath, env);
  mockCommonJsModule(loggerPath, logger);
  delete require.cache[middlewarePath];

  return {
    ...require(middlewarePath),
    mocks: {
      env,
      logger,
    },
  };
}

function createApp(middleware, { userHeader = null } = {}) {
  const app = express();
  app.use((req, _res, next) => {
    req.requestId = 'req-1';
    if (userHeader) {
      const userId = req.header(userHeader);
      if (userId) {
        req.user = { id: userId };
      }
    }
    next();
  });
  app.get('/limited', middleware, (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe('rate limit middleware', () => {
  it('getUserOrIpKey prefers req.user.id over req.ip', () => {
    const { getUserOrIpKey } = loadRateLimitMiddleware();

    expect(getUserOrIpKey({ user: { id: 'user-1' }, ip: '127.0.0.1' })).toBe('user:user-1');
  });

  it('getUserOrIpKey falls back to req.user.sub and then req.ip', () => {
    const { getUserOrIpKey } = loadRateLimitMiddleware();

    expect(getUserOrIpKey({ user: { sub: 'user-2' }, ip: '127.0.0.1' })).toBe('user:user-2');
    expect(getUserOrIpKey({ user: null, ip: '127.0.0.1' })).toBe('ip:127.0.0.1');
  });

  it('authLimiter returns AUTH_RATE_LIMIT on overflow', async () => {
    const { authLimiter } = loadRateLimitMiddleware();
    const app = createApp(authLimiter);

    await request(app).get('/limited').expect(200);
    const response = await request(app).get('/limited');

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('AUTH_RATE_LIMIT');
    expect(response.body.error.message).toBe('Too many auth requests');
  });

  it('loginLimiter returns LOGIN_RATE_LIMIT on overflow', async () => {
    const { loginLimiter } = loadRateLimitMiddleware();
    const app = createApp(loginLimiter);

    await request(app).get('/limited').expect(200);
    const response = await request(app).get('/limited');

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('LOGIN_RATE_LIMIT');
    expect(response.body.error.message).toBe('Too many login attempts');
  });

  it('uploadLimiter scopes rate limits by authenticated user', async () => {
    const { uploadLimiter } = loadRateLimitMiddleware();
    const app = createApp(uploadLimiter, { userHeader: 'x-user-id' });

    await request(app).get('/limited').set('x-user-id', 'user-1').expect(200);
    await request(app).get('/limited').set('x-user-id', 'user-2').expect(200);

    const response = await request(app).get('/limited').set('x-user-id', 'user-1');

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('UPLOAD_RATE_LIMIT');
    expect(response.body.error.message).toBe('Too many uploads');
  });

  it('createRateLimiter uses custom code and message in the handler', async () => {
    const { createRateLimiter } = loadRateLimitMiddleware();
    const limiter = createRateLimiter({
      windowMs: 60 * 1000,
      max: 1,
      code: 'CUSTOM_LIMIT',
      message: 'Custom rate limit message',
    });
    const app = createApp(limiter);

    await request(app).get('/limited').expect(200);
    const response = await request(app).get('/limited');

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('CUSTOM_LIMIT');
    expect(response.body.error.message).toBe('Custom rate limit message');
  });
});
