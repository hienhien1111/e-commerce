import type {
  EmailPort,
  TransactionalEmail,
} from '@/application/identity/ports/email/email.port';

export class InMemoryEmail implements EmailPort {
  readonly messages: TransactionalEmail[] = [];

  async send(message: TransactionalEmail): Promise<void> {
    this.messages.push(message);
  }

  latestTokenFor(to: string): string {
    const message = [...this.messages].reverse().find((item) => item.to === to);
    if (!message) {
      throw new Error(`No email sent to ${to}`);
    }

    const url = message.text.match(/https?:\/\/\S+/)?.[0];
    const token = url ? new URL(url).searchParams.get('token') : null;
    if (!token) {
      throw new Error(`No token in email sent to ${to}`);
    }
    return token;
  }
}
