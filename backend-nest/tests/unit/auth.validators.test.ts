import {
  normalizeEmail,
  normalizeUsername,
  parseForgotPasswordBody,
  parseLoginBody,
  parseRegistrationBody,
  parseResetPasswordBody,
  validateEmail,
  validatePassword,
  validateUsername,
} from '../../src/auth/validators/auth.validators';

describe('auth validators', () => {
  it('normalizes email', () => {
    expect(normalizeEmail('  USER@Example.COM  ')).toBe('user@example.com');
  });

  it('normalizes username', () => {
    expect(normalizeUsername('  User_Name  ')).toBe('user_name');
  });

  it('accepts a valid email', () => {
    const errors: Array<{ field: string; message: string }> = [];
    expect(validateEmail('User@example.com', errors)).toBe('user@example.com');
    expect(errors).toEqual([]);
  });

  it('rejects an invalid email', () => {
    const errors: Array<{ field: string; message: string }> = [];
    validateEmail('not-an-email', errors);
    expect(errors[0]?.field).toBe('email');
  });

  it('accepts a valid username', () => {
    const errors: Array<{ field: string; message: string }> = [];
    expect(validateUsername('User_123', errors)).toBe('user_123');
    expect(errors).toEqual([]);
  });

  it('rejects a username with spaces', () => {
    const errors: Array<{ field: string; message: string }> = [];
    validateUsername('bad name', errors);
    expect(errors[0]?.field).toBe('username');
  });

  it('rejects a password that is too short', () => {
    const errors: Array<{ field: string; message: string }> = [];
    validatePassword('short', errors);
    expect(errors[0]?.field).toBe('password');
  });

  it('normalizes registration body', () => {
    const result = parseRegistrationBody({
      email: ' User@Example.COM ',
      username: ' User_Name ',
      password: 'Password123',
    });

    expect(result.errors).toEqual([]);
    expect(result.value).toEqual({
      email: 'user@example.com',
      username: 'user_name',
      password: 'Password123',
    });
  });

  it('normalizes login body for email logins', () => {
    const result = parseLoginBody({
      login: ' User@Example.COM ',
      password: 'Password123',
    });

    expect(result.errors).toEqual([]);
    expect(result.value).toEqual({
      login: 'user@example.com',
      password: 'Password123',
    });
  });

  it('normalizes login body for username logins', () => {
    const result = parseLoginBody({
      login: ' User_Name ',
      password: 'Password123',
    });

    expect(result.errors).toEqual([]);
    expect(result.value).toEqual({
      login: 'user_name',
      password: 'Password123',
    });
  });

  it('validates forgot password body', () => {
    const result = parseForgotPasswordBody({ email: 'USER@example.com' });
    expect(result.errors).toEqual([]);
    expect(result.value.email).toBe('user@example.com');
  });

  it('validates reset password body', () => {
    const result = parseResetPasswordBody({
      token: '  token-1 ',
      password: 'NewPassword123',
    });

    expect(result.errors).toEqual([]);
    expect(result.value).toEqual({
      token: 'token-1',
      password: 'NewPassword123',
    });
  });
});
