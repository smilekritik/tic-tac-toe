const buckets = new Map();
const { getLogger, withRequestContext } = require('./logger');

function createError(code, status, meta) {
  const err = new Error(code);
  err.code = code;
  err.status = status;
  if (meta) err.meta = meta;
  return err;
}

function nowMs() {
  return Date.now();
}

function pruneOld(timestamps, cutoffMs) {
  while (timestamps.length && timestamps[0] < cutoffMs) timestamps.shift();
}

function enforceBusinessRateLimit({ key, maxInWindow, windowMs, minIntervalMs }) {
  if (!key) throw new Error('businessRateLimit: key is required');

  const ts = buckets.get(key) || [];
  const t = nowMs();

  if (minIntervalMs && ts.length) {
    const delta = t - ts[ts.length - 1];
    if (delta < minIntervalMs) {
      const retryAfterMs = minIntervalMs - delta;

      withRequestContext({}, () => {
        const log = getLogger('security');
        log.warn(
          {
            event: 'business_rate_limit_hit',
            key,
            reason: 'minIntervalMs',
            retryAfterMs,
          },
          'Business rate limit hit (interval)',
        );
      });

      throw createError('BUSINESS_RATE_LIMIT', 429, { retryAfterMs });
    }
  }

  if (maxInWindow && windowMs) {
    const cutoff = t - windowMs;
    pruneOld(ts, cutoff);

    if (ts.length >= maxInWindow) {
      const oldest = ts[0];
      const retryAfterMs = Math.max(0, oldest + windowMs - t);

      withRequestContext({}, () => {
        const log = getLogger('security');
        log.warn(
          {
            event: 'business_rate_limit_hit',
            key,
            reason: 'maxInWindow',
            retryAfterMs,
          },
          'Business rate limit hit (window)',
        );
      });

      throw createError('BUSINESS_RATE_LIMIT', 429, { retryAfterMs });
    }
  }

  ts.push(t);
  buckets.set(key, ts);
}

function resetBusinessRateLimits() {
  buckets.clear();
}

module.exports = { enforceBusinessRateLimit, resetBusinessRateLimits };

