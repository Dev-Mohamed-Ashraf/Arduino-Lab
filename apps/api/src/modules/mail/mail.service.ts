import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

import { AppConfigService } from '../../config/app-config.service';
import {
  bookingCancelledTemplate,
  bookingConfirmedTemplate,
  resetPasswordTemplate,
    type BookingMailData,
} from './mail.templates';

/**
 * Transactional email.
 *
 * Delivery never blocks the request that triggered it: a booking that succeeded
 * must not be reported as failed because Resend was down. Failures are logged
 * and swallowed. Without an API key (local development) the message is printed
 * to the console instead.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;

  constructor(private readonly config: AppConfigService) {
    this.resend = config.isMailConfigured ? new Resend(config.mail.apiKey) : null;
  }


  async sendPasswordReset(to: string, fullName: string, token: string): Promise<void> {
    const url = `${this.config.studentAppUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await this.send(to, resetPasswordTemplate(fullName, url));
  }

  async sendBookingConfirmed(to: string, data: BookingMailData): Promise<void> {
    await this.send(to, bookingConfirmedTemplate(data));
  }

  async sendBookingCancelled(
    to: string,
    data: Omit<BookingMailData, 'componentLines' | 'receiptUrl'>,
  ): Promise<void> {
    await this.send(to, bookingCancelledTemplate(data));
  }

  private async send(to: string, message: { subject: string; html: string }): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`[mail disabled] to=${to} subject="${message.subject}"`);
      return;
    }

    try {
      const { error } = await this.resend.emails.send({
        from: this.config.mail.from,
        to,
        subject: message.subject,
        html: message.html,
      });

      if (error) {
        this.logger.error(`Failed to send "${message.subject}" to ${to}: ${error.message}`);
        return;
      }

      this.logger.log(`Sent "${message.subject}" to ${to}`);
    } catch (error) {
      this.logger.error(`Mail transport error sending to ${to}`, error);
    }
  }
}
