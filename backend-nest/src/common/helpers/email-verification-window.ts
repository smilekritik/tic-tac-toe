export const EMAIL_VERIFICATION_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export function getEmailVerificationDeadline(createdAt: Date | string): Date {
  return new Date(new Date(createdAt).getTime() + EMAIL_VERIFICATION_GRACE_MS);
}

export function isEmailVerificationExpired(user: { emailVerified: boolean; createdAt: Date | string }): boolean {
  if (!user || user.emailVerified) {
    return false;
  }

  return getEmailVerificationDeadline(user.createdAt) <= new Date();
}
