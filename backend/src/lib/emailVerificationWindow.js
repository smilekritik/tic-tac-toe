const EMAIL_VERIFICATION_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

function getEmailVerificationDeadline(createdAt) {
  const createdTime = new Date(createdAt).getTime();
  return new Date(createdTime + EMAIL_VERIFICATION_GRACE_MS);
}

function isEmailVerificationExpired(user) {
  if (!user || user.emailVerified) {
    return false;
  }

  return getEmailVerificationDeadline(user.createdAt) <= new Date();
}

module.exports = {
  EMAIL_VERIFICATION_GRACE_MS,
  getEmailVerificationDeadline,
  isEmailVerificationExpired,
};
