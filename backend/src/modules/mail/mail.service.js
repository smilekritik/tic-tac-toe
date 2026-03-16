const nodemailer = require('nodemailer');
const env = require('../../config/env');
const { t } = require('../../lib/i18n');
const { getLogger } = require('../../lib/logger');

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.secure,
  auth: { user: env.smtp.user, pass: env.smtp.password },
});

function buildHtml(text, url) {
  return `<p>${text}</p><a href="${url}">${url}</a>`;
}

async function sendMailWithLogging({ type, userId, email, subject, html }) {
  const log = getLogger('mail');

  log.info(
    {
      event: 'mail_send_attempt',
      type,
      userId,
      email,
    },
    'Sending transactional email',
  );

  try {
    await transporter.sendMail({
      from: env.smtp.from,
      to: email,
      subject,
      html,
    });

    log.info(
      {
        event: 'mail_send_success',
        type,
        userId,
        email,
      },
      'Transactional email sent',
    );
  } catch (err) {
    log.error(
      {
        event: 'mail_send_failed',
        type,
        userId,
        email,
        message: err.message,
      },
      'Transactional email failed',
    );

    throw err;
  }
}

async function sendVerificationEmail(email, token, lang = 'en', { userId } = {}) {
  const url = `${env.frontendUrl}/auth/activate/${token}`;
  await sendMailWithLogging({
    type: 'verification',
    userId,
    email,
    subject: t(lang, 'mail.verify.subject'),
    html: buildHtml(t(lang, 'mail.verify.body'), url),
  });
}

async function sendPasswordResetEmail(email, token, lang = 'en', { userId } = {}) {
  const url = `${env.frontendUrl}/auth/reset-password?token=${token}`;
  await sendMailWithLogging({
    type: 'password_reset',
    userId,
    email,
    subject: t(lang, 'mail.reset.subject'),
    html: buildHtml(t(lang, 'mail.reset.body'), url),
  });
}

async function sendEmailChangeConfirmation(email, token, lang = 'en', { userId } = {}) {
  const url = `${env.frontendUrl}/auth/confirm-email?token=${token}`;
  await sendMailWithLogging({
    type: 'email_change_confirmation',
    userId,
    email,
    subject: t(lang, 'mail.emailChange.subject'),
    html: buildHtml(t(lang, 'mail.emailChange.body'), url),
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendEmailChangeConfirmation };
