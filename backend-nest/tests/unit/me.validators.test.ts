import {
  parseChangePasswordBody,
  parseDeleteAccountBody,
  parseRequestEmailChangeBody,
  parseUpdateSettingsBody,
  parseUpdateUsernameBody,
  parseUsernameAvailabilityQuery,
} from '../../src/me/validators/me.validators';

describe('me validators', () => {
  it('normalizes update settings body', () => {
    const result = parseUpdateSettingsBody({
      username: ' User_Name ',
      email: ' User@Example.COM ',
      preferredLanguage: ' PL ',
      chatEnabledDefault: true,
      publicProfileEnabled: false,
    });

    expect(result.errors).toEqual([]);
    expect(result.value).toMatchObject({
      username: 'user_name',
      email: 'user@example.com',
      preferredLanguage: 'pl',
      chatEnabledDefault: true,
      publicProfileEnabled: false,
    });
  });

  it('rejects invalid update settings values', () => {
    const result = parseUpdateSettingsBody({
      preferredLanguage: 'de',
      chatEnabledDefault: 'yes',
      publicProfileEnabled: 'no',
    });

    expect(result.errors).toHaveLength(3);
  });

  it('normalizes username availability query', () => {
    const result = parseUsernameAvailabilityQuery({ username: ' User_Name ' });

    expect(result.errors).toEqual([]);
    expect(result.value.username).toBe('user_name');
  });

  it('marks malformed query objects as query errors', () => {
    const result = parseUsernameAvailabilityQuery(null);

    expect(result.errors[0]).toMatchObject({
      field: '_',
      location: 'query',
    });
  });

  it('validates update username body', () => {
    const result = parseUpdateUsernameBody({ username: ' Player_1 ' });
    expect(result.errors).toEqual([]);
    expect(result.value.username).toBe('player_1');
  });

  it('validates request email change body', () => {
    const result = parseRequestEmailChangeBody({ email: ' USER@example.com ' });
    expect(result.errors).toEqual([]);
    expect(result.value.email).toBe('user@example.com');
  });

  it('requires current password and validates new password', () => {
    const result = parseChangePasswordBody({
      currentPassword: '',
      newPassword: 'short',
    });

    expect(result.errors).toHaveLength(2);
  });

  it('requires password when deleting account', () => {
    const result = parseDeleteAccountBody({});
    expect(result.errors[0]?.field).toBe('password');
  });
});
