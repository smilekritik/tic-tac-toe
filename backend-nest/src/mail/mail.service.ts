import { Injectable } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { AppConfigService } from '../config/app-config.service';
import { AppLoggerService } from '../logger/logger.service';
import { I18nService } from './i18n.service';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;

  constructor(
    private readonly config: AppConfigService,
    private readonly i18n: I18nService,
    private readonly logger: AppLoggerService,
  ) {
    this.transporter = nodemailer.createTransport(
      this.config.isTest
        ? ({ jsonTransport: true } as Parameters<typeof nodemailer.createTransport>[0])
        : {
            host: this.config.smtp.host,
            port: this.config.smtp.port,
            secure: this.config.smtp.secure,
            auth: {
              user: this.config.smtp.user,
              pass: this.config.smtp.password,
            },
          },
    );
  }

  async sendVerificationEmail(email: string, token: string, lang = 'en', options: { userId?: string } = {}): Promise<void> {
    const url = `${this.config.frontendUrl}/auth/activate/${token}`;
    await this.sendMailWithLogging({
      type: 'verification',
      userId: options.userId,
      email,
      subject: this.i18n.t(lang, 'mail.verify.subject'),
      html: this.buildActionEmail({
        lang,
        title: this.i18n.t(lang, 'mail.verify.title'),
        intro: this.i18n.t(lang, 'mail.verify.intro'),
        actionLabel: this.i18n.t(lang, 'mail.verify.button'),
        actionUrl: url,
        footer: this.i18n.t(lang, 'mail.verify.footer'),
      }),
    });
  }

  async sendPasswordResetEmail(email: string, token: string, lang = 'en', options: { userId?: string } = {}): Promise<void> {
    const url = `${this.config.frontendUrl}/auth/reset-password?token=${token}`;
    await this.sendMailWithLogging({
      type: 'password_reset',
      userId: options.userId,
      email,
      subject: this.i18n.t(lang, 'mail.reset.subject'),
      html: this.buildActionEmail({
        lang,
        title: this.i18n.t(lang, 'mail.reset.title'),
        intro: this.i18n.t(lang, 'mail.reset.intro'),
        actionLabel: this.i18n.t(lang, 'mail.reset.button'),
        actionUrl: url,
        footer: this.i18n.t(lang, 'mail.reset.footer'),
      }),
    });
  }

  async sendEmailChangeConfirmation(email: string, token: string, lang = 'en', options: { userId?: string } = {}): Promise<void> {
    const url = `${this.config.frontendUrl}/auth/confirm-email?token=${token}`;
    await this.sendMailWithLogging({
      type: 'email_change_confirmation',
      userId: options.userId,
      email,
      subject: this.i18n.t(lang, 'mail.emailChange.subject'),
      html: this.buildActionEmail({
        lang,
        title: this.i18n.t(lang, 'mail.emailChange.title'),
        intro: this.i18n.t(lang, 'mail.emailChange.intro'),
        actionLabel: this.i18n.t(lang, 'mail.emailChange.button'),
        actionUrl: url,
        footer: this.i18n.t(lang, 'mail.emailChange.footer'),
      }),
    });
  }

  private async sendMailWithLogging(input: {
    type: string;
    userId?: string;
    email: string;
    subject: string;
    html: string;
  }): Promise<void> {
    const log = this.logger.getLogger('mail');

    log.info(
      {
        event: 'mail_send_attempt',
        type: input.type,
        userId: input.userId,
        email: input.email,
      },
      'Sending transactional email',
    );

    try {
      await this.transporter.sendMail({
        from: this.config.smtp.from,
        to: input.email,
        subject: input.subject,
        html: input.html,
      });

      log.info(
        {
          event: 'mail_send_success',
          type: input.type,
          userId: input.userId,
          email: input.email,
        },
        'Transactional email sent',
      );
    } catch (error) {
      log.error(
        {
          event: 'mail_send_failed',
          type: input.type,
          userId: input.userId,
          email: input.email,
          message: error instanceof Error ? error.message : 'Unknown mail error',
        },
        'Transactional email failed',
      );

      throw error;
    }
  }

  private buildActionEmail(input: {
    lang: string;
    title: string;
    intro: string;
    actionLabel: string;
    actionUrl: string;
    footer: string;
  }): string {
    const safeTitle = this.escapeHtml(input.title);
    const safeIntro = this.escapeHtml(input.intro);
    const safeActionLabel = this.escapeHtml(input.actionLabel);
    const safeActionUrl = this.escapeHtml(input.actionUrl);
    const safeFooter = this.escapeHtml(input.footer);
    const safeAppName = this.escapeHtml(this.i18n.t(input.lang, 'mail.common.appName'));
    const safeGreeting = this.escapeHtml(this.i18n.t(input.lang, 'mail.common.greeting'));
    const safeIgnoreText = this.escapeHtml(this.i18n.t(input.lang, 'mail.common.ignoreText'));
    const safeAlternativeText = this.escapeHtml(this.i18n.t(input.lang, 'mail.common.alternativeText'));

    return `
      <!doctype html>
      <html lang="${this.escapeHtml(input.lang)}">
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

  private escapeHtml(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
