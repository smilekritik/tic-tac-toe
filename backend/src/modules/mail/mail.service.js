const nodemailer = require('nodemailer');
const env = require('../../config/env');
const { t } = require('../../lib/i18n');

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.secure,
  auth: { user: env.smtp.user, pass: env.smtp.password },
});

function buildHtml(text, url) {
  return `<p>${text}</p><a href="${url}">${url}</a>`;
}

async function sendVerificationEmail(email, token, lang = 'en') {
  const url = `${env.frontendUrl}/auth/activate/${token}`;
  console.log(`[mail] verification url: ${url}`);
  await transporter.sendMail({
    from: env.smtp.from,
    to: email,
    subject: t(lang, 'mail.verify.subject'),
    html: buildHtml(t(lang, 'mail.verify.body'), url),
  });
}

async function sendPasswordResetEmail(email, token, lang = 'en') {
  const url = `${env.frontendUrl}/auth/reset-password?token=${token}`;
  console.log(`[mail] reset url: ${url}`);
  await transporter.sendMail({
    from: env.smtp.from,
    to: email,
    subject: t(lang, 'mail.reset.subject'),
    html: buildHtml(t(lang, 'mail.reset.body'), url),
  });
}

async function sendEmailChangeConfirmation(email, token, lang = 'en') {
  const url = `${env.frontendUrl}/auth/confirm-email?token=${token}`;
  console.log(`[mail] email change url: ${url}`);
  await transporter.sendMail({
    from: env.smtp.from,
    to: email,
    subject: t(lang, 'mail.emailChange.subject'),
    html: buildHtml(t(lang, 'mail.emailChange.body'), url),
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendEmailChangeConfirmation };
