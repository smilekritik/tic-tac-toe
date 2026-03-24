const {
  enforceBusinessRateLimit,
  resetBusinessRateLimits,
} = require('../../../src/lib/businessRateLimit');

describe('business rate limit helper', () => {
  afterEach(() => {
    resetBusinessRateLimits();
  });

  it('blocks calls inside minIntervalMs and exposes retryAfterMs', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    enforceBusinessRateLimit({ key: 'interval-key', minIntervalMs: 1000 });

    const run = () => enforceBusinessRateLimit({ key: 'interval-key', minIntervalMs: 1000 });

    expect(run).toThrow('BUSINESS_RATE_LIMIT');

    try {
      run();
    } catch (err) {
      expect(err.code).toBe('BUSINESS_RATE_LIMIT');
      expect(err.meta.retryAfterMs).toBe(1000);
    }
  });

  it('blocks calls after maxInWindow is reached', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    enforceBusinessRateLimit({ key: 'window-key', maxInWindow: 2, windowMs: 5000 });
    vi.advanceTimersByTime(1000);
    enforceBusinessRateLimit({ key: 'window-key', maxInWindow: 2, windowMs: 5000 });

    const run = () => enforceBusinessRateLimit({ key: 'window-key', maxInWindow: 2, windowMs: 5000 });

    expect(run).toThrow('BUSINESS_RATE_LIMIT');
  });
});
