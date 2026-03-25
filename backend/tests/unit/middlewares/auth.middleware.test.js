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

function loadAuthMiddleware({ verifyAccessTokenImpl } = {}) {
  const tokenService = {
    verifyAccessToken: vi.fn(verifyAccessTokenImpl || (() => ({ sub: 'user-1', role: 'user' }))),
  };
  const logger = {
    getLogger: vi.fn(() => ({
      warn: vi.fn(),
      info: vi.fn(),
    })),
    withRequestContext: vi.fn((_context, fn) => fn()),
  };

  const tokenServicePath = require.resolve(path.resolve(__dirname, '../../../src/modules/auth/token.service.js'));
  const loggerPath = require.resolve(path.resolve(__dirname, '../../../src/lib/logger.js'));
  const middlewarePath = require.resolve(path.resolve(__dirname, '../../../src/middlewares/auth.middleware.js'));

  mockCommonJsModule(tokenServicePath, tokenService);
  mockCommonJsModule(loggerPath, logger);
  delete require.cache[middlewarePath];

  return {
    ...require(middlewarePath),
    mocks: {
      tokenService,
      logger,
    },
  };
}

function createReq(overrides = {}) {
  return {
    headers: {},
    requestId: 'req-1',
    ip: '127.0.0.1',
    method: 'GET',
    originalUrl: '/test',
    url: '/test',
    ...overrides,
  };
}

function createRes() {
  return {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

describe('auth middleware', () => {
  it('requireAuth rejects missing authorization headers', () => {
    const { requireAuth } = loadAuthMiddleware();
    const req = createReq();
    const res = createRes();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.payload).toEqual({ error: { message: 'Unauthorized' } });
    expect(next).not.toHaveBeenCalled();
  });

  it('requireAuth rejects invalid bearer tokens', () => {
    const { requireAuth, mocks } = loadAuthMiddleware({
      verifyAccessTokenImpl: () => {
        throw new Error('bad token');
      },
    });
    const req = createReq({
      headers: { authorization: 'Bearer broken-token' },
    });
    const res = createRes();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(mocks.tokenService.verifyAccessToken).toHaveBeenCalledWith('broken-token');
    expect(res.statusCode).toBe(401);
    expect(res.payload).toEqual({ error: { message: 'Invalid or expired token' } });
    expect(next).not.toHaveBeenCalled();
  });

  it('requireAuth attaches req.user and calls next for valid tokens', () => {
    const payload = { sub: 'user-42', role: 'admin' };
    const { requireAuth } = loadAuthMiddleware({
      verifyAccessTokenImpl: () => payload,
    });
    const req = createReq({
      headers: { authorization: 'Bearer valid-token' },
    });
    const res = createRes();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(req.user).toEqual(payload);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
  });

  it('optionalAuth skips token verification when authorization header is absent', () => {
    const { optionalAuth, mocks } = loadAuthMiddleware();
    const req = createReq();
    const next = vi.fn();

    optionalAuth(req, {}, next);

    expect(mocks.tokenService.verifyAccessToken).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('optionalAuth sets req.user for valid bearer tokens', () => {
    const payload = { sub: 'user-42', role: 'user' };
    const { optionalAuth } = loadAuthMiddleware({
      verifyAccessTokenImpl: () => payload,
    });
    const req = createReq({
      headers: { authorization: 'Bearer valid-token' },
    });
    const next = vi.fn();

    optionalAuth(req, {}, next);

    expect(req.user).toEqual(payload);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('optionalAuth swallows invalid bearer tokens and sets req.user to null', () => {
    const { optionalAuth } = loadAuthMiddleware({
      verifyAccessTokenImpl: () => {
        throw new Error('bad token');
      },
    });
    const req = createReq({
      headers: { authorization: 'Bearer broken-token' },
    });
    const next = vi.fn();

    optionalAuth(req, {}, next);

    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('requireRole allows users with matching roles', () => {
    const { requireRole } = loadAuthMiddleware();
    const req = createReq({
      user: { id: 'user-1', role: 'admin' },
    });
    const res = createRes();
    const next = vi.fn();

    requireRole('admin', 'superadmin')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
  });

  it('requireRole rejects users with non-matching roles', () => {
    const { requireRole } = loadAuthMiddleware();
    const req = createReq({
      user: { id: 'user-1', role: 'user' },
    });
    const res = createRes();
    const next = vi.fn();

    requireRole('admin')(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({ error: { message: 'Forbidden' } });
    expect(next).not.toHaveBeenCalled();
  });

  it('requireRole rejects requests without req.user', () => {
    const { requireRole } = loadAuthMiddleware();
    const req = createReq();
    const res = createRes();
    const next = vi.fn();

    requireRole('admin')(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({ error: { message: 'Forbidden' } });
    expect(next).not.toHaveBeenCalled();
  });
});
