import { addMilliseconds, isSameOrBeforeNow } from '../time/dayjs';

export const EMAIL_VERIFICATION_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export function getEmailVerificationDeadline(createdAt: Date | string): Date {
  return addMilliseconds(createdAt, EMAIL_VERIFICATION_GRACE_MS).toDate();
}

export function isEmailVerificationExpired(user: { emailVerified: boolean; createdAt: Date | string }): boolean {
  if (!user || user.emailVerified) {
    return false;
  }

  return isSameOrBeforeNow(getEmailVerificationDeadline(user.createdAt));
}
