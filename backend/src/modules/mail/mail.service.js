const nodemailer = require('nodemailer');
const env = require('../../config/env');
const { t } = require('../../lib/i18n');
const { getLogger } = require('../../lib/logger');

const transporter = nodemailer.createTransport(
  env.nodeEnv === 'test'
    ? { jsonTransport: true }
    : {
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.password },
    },
);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildActionEmail({
  lang,
  title,
  intro,
  actionLabel,
  actionUrl,
  footer,
}) {
  const safeTitle = escapeHtml(title);
  const safeIntro = escapeHtml(intro);
  const safeActionLabel = escapeHtml(actionLabel);
  const safeActionUrl = escapeHtml(actionUrl);
  const safeFooter = escapeHtml(footer);
  const safeAppName = escapeHtml(t(lang, 'mail.common.appName'));
  const safeGreeting = escapeHtml(t(lang, 'mail.common.greeting'));
  const safeIgnoreText = escapeHtml(t(lang, 'mail.common.ignoreText'));
  const safeAlternativeText = escapeHtml(t(lang, 'mail.common.alternativeText'));

  return `
    <!doctype html>
    <html lang="${escapeHtml(lang)}">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${safeTitle}</title>
      </head>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e4e4e7;border-radius:16px;overflow:hidden;">
                <tr>
                  <td style="padding:24px 28px;background:#111827;color:#ffffff;">
                    <div style="font-size:14px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.72;">${safeAppName}</div>
                    <div style="margin-top:10px;font-size:28px;font-weight:700;line-height:1.2;">${safeTitle}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px;">
                    <p style="margin:0 0 12px;font-size:16px;line-height:1.6;">${safeGreeting}</p>
                    <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#3f3f46;">${safeIntro}</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                      <tr>
                        <td style="border-radius:12px;background:#f97316;">
                          <a href="${safeActionUrl}" style="display:inline-block;padding:14px 22px;font-size:15px;font-weight:700;line-height:1;text-decoration:none;color:#ffffff;">
                            ${safeActionLabel}
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#52525b;">${safeIgnoreText}</p>
                    <p style="margin:0 0 8px;font-size:13px;line-height:1.7;color:#71717a;">${safeAlternativeText}</p>
                    <p style="margin:0 0 24px;font-size:13px;line-height:1.7;word-break:break-all;">
                      <a href="${safeActionUrl}" style="color:#ea580c;text-decoration:none;">${safeActionUrl}</a>
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#3f3f46;">${safeFooter}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
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
    html: buildActionEmail({
      lang,
      title: t(lang, 'mail.verify.title'),
      intro: t(lang, 'mail.verify.intro'),
      actionLabel: t(lang, 'mail.verify.button'),
      actionUrl: url,
      footer: t(lang, 'mail.verify.footer'),
    }),
  });
}

async function sendPasswordResetEmail(email, token, lang = 'en', { userId } = {}) {
  const url = `${env.frontendUrl}/auth/reset-password?token=${token}`;
  await sendMailWithLogging({
    type: 'password_reset',
    userId,
    email,
    subject: t(lang, 'mail.reset.subject'),
    html: buildActionEmail({
      lang,
      title: t(lang, 'mail.reset.title'),
      intro: t(lang, 'mail.reset.intro'),
      actionLabel: t(lang, 'mail.reset.button'),
      actionUrl: url,
      footer: t(lang, 'mail.reset.footer'),
    }),
  });
}

async function sendEmailChangeConfirmation(email, token, lang = 'en', { userId } = {}) {
  const url = `${env.frontendUrl}/auth/confirm-email?token=${token}`;
  await sendMailWithLogging({
    type: 'email_change_confirmation',
    userId,
    email,
    subject: t(lang, 'mail.emailChange.subject'),
    html: buildActionEmail({
      lang,
      title: t(lang, 'mail.emailChange.title'),
      intro: t(lang, 'mail.emailChange.intro'),
      actionLabel: t(lang, 'mail.emailChange.button'),
      actionUrl: url,
      footer: t(lang, 'mail.emailChange.footer'),
    }),
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendEmailChangeConfirmation };
