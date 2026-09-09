import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

// Thin wrapper around nodemailer so the rest of the app never touches SMTP
// directly. When no SMTP_HOST is configured (e.g. a fresh local checkout, or
// a deployment where email hasn't been set up yet) this logs the message
// instead of throwing, so signup/forgot-password keep working end to end —
// the verification/reset link just appears in the server log rather than an
// inbox. Set SMTP_HOST/PORT/USER/PASS (+ MAIL_FROM) to send real email.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly from: string;
  readonly frontendUrl: string;

  constructor(private config: ConfigService) {
    this.from = this.config.get<string>('MAIL_FROM', 'Hotel CMS <no-reply@hotel-cms.local>');
    this.frontendUrl = (
      this.config.get<string>('FRONTEND_URL') ||
      this.config.get<string>('CORS_ORIGIN') ||
      'http://localhost:3000'
    ).replace(/\/$/, '');

    const host = this.config.get<string>('SMTP_HOST');
    if (host) {
      const user = this.config.get<string>('SMTP_USER');
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('SMTP_PORT', 587),
        secure: this.config.get<string>('SMTP_SECURE') === 'true',
        auth: user ? { user, pass: this.config.get<string>('SMTP_PASS') } : undefined,
      });
    }
  }

  private async send(to: string, subject: string, text: string, html: string) {
    if (!this.transporter) {
      this.logger.log(`[dev email — no SMTP_HOST configured] To: ${to}\nSubject: ${subject}\n\n${text}`);
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, text, html });
    } catch (err) {
      // Never let a mail-provider outage fail the request that triggered it
      // (signup, forgot-password, etc.) — the user can always resend/retry.
      this.logger.error(`Failed to send email to ${to}: ${(err as Error).message}`);
    }
  }

  async sendVerificationEmail(to: string, name: string, token: string) {
    const link = `${this.frontendUrl}/verify-email?token=${token}`;
    await this.send(
      to,
      'Verify your email — Hotel CMS',
      `Hi ${name},\n\nPlease verify your email address by visiting:\n${link}\n\nThis link expires in 24 hours.`,
      `<p>Hi ${escapeHtml(name)},</p><p>Please verify your email address:</p><p><a href="${link}">${link}</a></p><p>This link expires in 24 hours.</p>`,
    );
  }

  async sendPasswordResetEmail(to: string, name: string, token: string) {
    const link = `${this.frontendUrl}/reset-password?token=${token}`;
    await this.send(
      to,
      'Reset your password — Hotel CMS',
      `Hi ${name},\n\nWe received a request to reset your password. Visit this link to choose a new one:\n${link}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
      `<p>Hi ${escapeHtml(name)},</p><p>We received a request to reset your password. Click below to choose a new one:</p><p><a href="${link}">${link}</a></p><p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
    );
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}
