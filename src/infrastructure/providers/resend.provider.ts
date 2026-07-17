import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { AllConfigType } from '@/config/config.type';
import type {
  EmailPort,
  TransactionalEmail,
} from '@/application/identity/ports/email/email.port';

const EMAIL_DELIVERY_TIMEOUT_MS = 10_000;

@Injectable()
export class ResendProvider implements EmailPort {
  private readonly logger = new Logger(ResendProvider.name);
  private readonly apiKey?: string;
  private readonly from?: string;

  constructor(private readonly configService: ConfigService<AllConfigType>) {
    const config = this.configService.get('resend', { infer: true });
    this.apiKey = config?.apiKey;
    this.from = config?.from;
  }

  async send(message: TransactionalEmail): Promise<void> {
    if (!this.apiKey || !this.from) {
      throw new ServiceUnavailableException('Email delivery is unavailable');
    }

    try {
      const resend = new Resend(this.apiKey);
      const { error } = await this.withTimeout(
        resend.emails.send({
          from: this.from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      );
      if (!error) {
        this.logger.log('Transactional email accepted by Resend');
        return;
      }

      this.logger.warn(`Resend rejected transactional email: ${error.message}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Resend delivery failed: ${message}`);
    }

    throw new ServiceUnavailableException('Email delivery is unavailable');
  }

  private async withTimeout<T>(operation: Promise<T>): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation,
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error('Email delivery timed out')),
            EMAIL_DELIVERY_TIMEOUT_MS,
          );
        }),
      ]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }
}
