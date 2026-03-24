const { validate, requireBodyObject } = require('../../../src/middlewares/validate.middleware');

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

describe('validate middleware helpers', () => {
  it('lets plain object bodies pass through requireBodyObject', () => {
    const next = vi.fn();
    const res = createRes();

    requireBodyObject({ body: {}, headers: {}, ip: '127.0.0.1', method: 'POST', url: '/x' }, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });

  it('rejects null bodies', () => {
    const next = vi.fn();
    const res = createRes();

    requireBodyObject({ body: null, headers: {}, ip: '127.0.0.1', method: 'POST', url: '/x' }, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.payload.error.code).toBe('INVALID_BODY');
  });

  it('rejects array bodies', () => {
    const next = vi.fn();
    const res = createRes();

    requireBodyObject({ body: [], headers: {}, ip: '127.0.0.1', method: 'POST', url: '/x' }, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.payload.error.code).toBe('INVALID_BODY');
  });

  it('collects validation errors and rewrites request body when validator returns data', () => {
    const next = vi.fn();
    const res = createRes();
    const middleware = validate({
      body: (body, { addError }) => {
        if (!body.name) {
          addError('name', 'Name is required');
        }
        return { ...body, name: body.name?.trim() };
      },
    });

    const req = {
      body: { name: ' Alice ' },
      headers: {},
      ip: '127.0.0.1',
      method: 'POST',
      url: '/x',
    };
    middleware(req, res, next);

    expect(req.body.name).toBe('Alice');
    expect(next).toHaveBeenCalled();
  });

  it('returns validation error response when validator reports an error', () => {
    const next = vi.fn();
    const res = createRes();
    const middleware = validate({
      body: (_body, { addError }) => {
        addError('name', 'Name is required');
        return {};
      },
    });

    middleware({ body: {}, headers: {}, ip: '127.0.0.1', method: 'POST', url: '/x' }, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.payload.error.code).toBe('VALIDATION_ERROR');
    expect(next).not.toHaveBeenCalled();
  });
});
