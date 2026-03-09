const nodemailer = require('nodemailer');
const env = require('../../config/env');

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.secure,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.password,
  },
});

async function sendVerificationEmail(email, token) {
  const url = `${env.frontendUrl}/auth/activate/${token}`;
  console.log(`[mail] verification url: ${url}`);
  await transporter.sendMail({
    from: env.smtp.from,
    to: email,
    subject: 'Verify your email',
    html: `<p>Click to verify your account:</p><a href="${url}">${url}</a>`,
  });
}

async function sendPasswordResetEmail(email, token) {
  const url = `${env.frontendUrl}/auth/reset-password?token=${token}`;
  console.log(`[mail] reset url: ${url}`);
  await transporter.sendMail({
    from: env.smtp.from,
    to: email,
    subject: 'Reset your password',
    html: `<p>Click to reset your password:</p><a href="${url}">${url}</a>`,
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
