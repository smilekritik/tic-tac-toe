import {
  EMAIL_VERIFICATION_GRACE_MS,
  getEmailVerificationDeadline,
  isEmailVerificationExpired,
} from '../../src/common/helpers/email-verification-window';

describe('email verification window helper', () => {
  it('builds the correct verification deadline', () => {
    const createdAt = new Date('2026-01-01T00:00:00Z');

    expect(getEmailVerificationDeadline(createdAt).getTime()).toBe(
      createdAt.getTime() + EMAIL_VERIFICATION_GRACE_MS,
    );
  });

  it('does not expire verified users', () => {
    expect(
      isEmailVerificationExpired({
        emailVerified: true,
        createdAt: new Date('2020-01-01T00:00:00Z'),
      }),
    ).toBe(false);
  });

  it('expires old unverified users', () => {
    expect(
      isEmailVerificationExpired({
        emailVerified: false,
        createdAt: new Date('2020-01-01T00:00:00Z'),
      }),
    ).toBe(true);
  });
});
