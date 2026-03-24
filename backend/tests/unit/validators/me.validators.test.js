const meValidators = require('../../../src/validators/me.validators');

function createAddErrorSink() {
  const errors = [];
  return {
    errors,
    addError: (field, message) => errors.push({ field, message }),
  };
}

describe('me validators', () => {
  it('normalizes update settings body', () => {
    const result = meValidators.updateSettingsBody(
      {
        username: ' User_Name ',
        email: ' User@Example.COM ',
        preferredLanguage: ' PL ',
        chatEnabledDefault: true,
        publicProfileEnabled: false,
      },
      createAddErrorSink(),
    );

    expect(result).toMatchObject({
      username: 'user_name',
      email: 'user@example.com',
      preferredLanguage: 'pl',
      chatEnabledDefault: true,
      publicProfileEnabled: false,
    });
  });

  it('rejects invalid update settings values', () => {
    const sink = createAddErrorSink();

    meValidators.updateSettingsBody(
      {
        preferredLanguage: 'de',
        chatEnabledDefault: 'yes',
        publicProfileEnabled: 'no',
      },
      sink,
    );

    expect(sink.errors).toHaveLength(3);
  });

  it('normalizes username availability query', () => {
    const result = meValidators.checkUsernameAvailabilityQuery(
      { username: ' User_Name ' },
      createAddErrorSink(),
    );

    expect(result.username).toBe('user_name');
  });

  it('requires current and new password for change password', () => {
    const sink = createAddErrorSink();

    meValidators.changePasswordBody({ currentPassword: '', newPassword: 'short' }, sink);

    expect(sink.errors).toHaveLength(2);
  });

  it('requires password to delete account', () => {
    const sink = createAddErrorSink();

    meValidators.deleteAccountBody({}, sink);

    expect(sink.errors[0].field).toBe('password');
  });
});
