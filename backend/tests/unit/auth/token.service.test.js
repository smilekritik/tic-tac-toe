const tokenService = require('../../../src/modules/auth/token.service');

describe('token service', () => {
  it('generates and verifies an access token', () => {
    const token = tokenService.generateAccessToken({ id: 'user-1', role: 'user' });
    const payload = tokenService.verifyAccessToken(token);

    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe('user');
  });

  it('parses refresh expiration values for minutes, hours and days', () => {
    expect(tokenService.parseRefreshExpiration('15m')).toBe(15 * 60 * 1000);
    expect(tokenService.parseRefreshExpiration('2h')).toBe(2 * 60 * 60 * 1000);
    expect(tokenService.parseRefreshExpiration('7d')).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('falls back to 7 days for invalid refresh expiration format', () => {
    expect(tokenService.parseRefreshExpiration('oops')).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('hashes tokens deterministically', () => {
    expect(tokenService.hashToken('same-token')).toBe(tokenService.hashToken('same-token'));
  });

  it('generates refresh token data with token, hash and expiry date', () => {
    const result = tokenService.generateRefreshToken();

    expect(result.token).toMatch(/^[a-f0-9]+$/);
    expect(result.hash).toBe(tokenService.hashToken(result.token));
    expect(result.expiresAt).toBeInstanceOf(Date);
  });
});
