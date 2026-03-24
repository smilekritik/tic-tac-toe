const authValidators = require('../../../src/validators/auth.validators');

function createAddErrorSink() {
  const errors = [];
  return {
    errors,
    addError: (field, message) => errors.push({ field, message }),
  };
}

describe('auth validators', () => {
  it('normalizes email', () => {
    expect(authValidators.normalizeEmail('  USER@Example.COM  ')).toBe('user@example.com');
  });

  it('normalizes username', () => {
    expect(authValidators.normalizeUsername('  User_Name  ')).toBe('user_name');
  });

  it('accepts a valid email', () => {
    const { errors, addError } = createAddErrorSink();

    expect(authValidators.validateEmail('User@example.com', { addError })).toBe('user@example.com');
    expect(errors).toEqual([]);
  });

  it('rejects an invalid email', () => {
    const { errors, addError } = createAddErrorSink();

    authValidators.validateEmail('not-an-email', { addError });

    expect(errors[0].field).toBe('email');
  });

  it('accepts a valid username', () => {
    const { errors, addError } = createAddErrorSink();

    expect(authValidators.validateUsername('User_123', { addError })).toBe('user_123');
    expect(errors).toEqual([]);
  });

  it('rejects a username with spaces', () => {
    const { errors, addError } = createAddErrorSink();

    authValidators.validateUsername('bad name', { addError });

    expect(errors[0].field).toBe('username');
  });

  it('rejects a password that is too short', () => {
    const { errors, addError } = createAddErrorSink();

    authValidators.validatePassword('abc12', { addError });

    expect(errors[0].message).toMatch(/at least 8/);
  });

  it('rejects a password that is too long', () => {
    const { errors, addError } = createAddErrorSink();

    authValidators.validatePassword('a'.repeat(73), { addError });

    expect(errors[0].message).toMatch(/too long/);
  });

  it('rejects a password without a letter', () => {
    const { errors, addError } = createAddErrorSink();

    authValidators.validatePassword('12345678', { addError });

    expect(errors[0].message).toMatch(/letters and numbers/);
  });

  it('rejects a password without a number', () => {
    const { errors, addError } = createAddErrorSink();

    authValidators.validatePassword('password', { addError });

    expect(errors[0].message).toMatch(/letters and numbers/);
  });

  it('rejects a password containing username or email', () => {
    const { errors, addError } = createAddErrorSink();

    authValidators.validatePassword('user12345', {
      addError,
      username: 'user',
      email: 'user@example.com',
    });

    expect(errors[0].message).toMatch(/username|email/);
  });

  it('normalizes registration body fields', () => {
    const result = authValidators.registrationBody(
      {
        email: ' User@Example.COM ',
        username: ' Test_User ',
        password: 'safePass123',
      },
      createAddErrorSink(),
    );

    expect(result).toMatchObject({
      email: 'user@example.com',
      username: 'test_user',
      password: 'safePass123',
    });
  });

  it('normalizes login body for email logins', () => {
    const result = authValidators.loginBody(
      { login: ' USER@Example.COM ', password: 'secret123' },
      createAddErrorSink(),
    );

    expect(result).toEqual({ login: 'user@example.com', password: 'secret123' });
  });

  it('normalizes login body for username logins', () => {
    const result = authValidators.loginBody(
      { login: ' User_Name ', password: 'secret123' },
      createAddErrorSink(),
    );

    expect(result).toEqual({ login: 'user_name', password: 'secret123' });
  });

  it('normalizes forgot-password body', () => {
    const result = authValidators.forgotPasswordBody(
      { email: ' User@Example.COM ' },
      createAddErrorSink(),
    );

    expect(result.email).toBe('user@example.com');
  });

  it('normalizes reset-password body and requires token', () => {
    const sink = createAddErrorSink();
    const result = authValidators.resetPasswordBody(
      { token: ' abc ', password: 'safePass123' },
      sink,
    );

    expect(result).toEqual({ token: 'abc', password: 'safePass123' });
    expect(sink.errors).toEqual([]);
  });
});
