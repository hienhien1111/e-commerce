import { BaseDomainModel } from '@/shared/domain/base-domain-model';
import { PaymentStatusEnum } from '@/domain/enums/payment-status.enum';

export type PaymentAttempt = {
  attempt: number;
  providerOrderId: string;
  requestId: string;
  startedAt: string;
  phase?: 'INITIATING' | 'READY' | 'FAILED';
  resultCode?: number;
  message?: string;
};

export type PaymentMetadata = {
  attempts: PaymentAttempt[];
  lastIpn?: Record<string, unknown>;
};

export type PaymentProps = {
  orderId: string;
  provider: string;
  amount: number;
  currency: string;
  status: PaymentStatusEnum;
  providerOrderId: string | null;
  providerTransId: string | null;
  payUrl: string | null;
  qrCodeUrl: string | null;
  deeplink: string | null;
  metadata: PaymentMetadata;
  expiresAt: Date | null;
  paidAt: Date | null;
};

export class Payment extends BaseDomainModel<PaymentProps> {
  private constructor(
    props: PaymentProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(props, id, createdAt, updatedAt);
    this.validate();
  }

  static _create(
    props: PaymentProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
  ): Payment {
    return new Payment(props, id, createdAt, updatedAt);
  }

  private validate(): void {
    if (!this.props.orderId) throw new Error('Payment order is required');
    if (!this.props.provider.trim())
      throw new Error('Payment provider is required');
    if (!Number.isInteger(this.props.amount) || this.props.amount <= 0) {
      throw new Error('Payment amount must be a positive integer');
    }
    if (!this.props.currency.trim())
      throw new Error('Payment currency is required');
  }

  get orderId(): string {
    return this.props.orderId;
  }
  get provider(): string {
    return this.props.provider;
  }
  get amount(): number {
    return this.props.amount;
  }
  get currency(): string {
    return this.props.currency;
  }
  get status(): PaymentStatusEnum {
    return this.props.status;
  }
  get providerOrderId(): string | null {
    return this.props.providerOrderId;
  }
  get providerTransId(): string | null {
    return this.props.providerTransId;
  }
  get payUrl(): string | null {
    return this.props.payUrl;
  }
  get qrCodeUrl(): string | null {
    return this.props.qrCodeUrl;
  }
  get deeplink(): string | null {
    return this.props.deeplink;
  }
  get metadata(): PaymentMetadata {
    return this.props.metadata;
  }
  get expiresAt(): Date | null {
    return this.props.expiresAt;
  }
  get paidAt(): Date | null {
    return this.props.paidAt;
  }

  isReusable(now = new Date()): boolean {
    return (
      this.status === PaymentStatusEnum.PENDING &&
      this.expiresAt !== null &&
      this.expiresAt > now &&
      this.payUrl !== null
    );
  }

  isInitiating(now = new Date(), timeoutMs = 60_000): boolean {
    const latest = this.props.metadata.attempts.at(-1);
    if (
      this.status !== PaymentStatusEnum.PENDING ||
      this.payUrl !== null ||
      latest?.phase !== 'INITIATING'
    ) {
      return false;
    }
    return now.getTime() - new Date(latest.startedAt).getTime() < timeoutMs;
  }

  get latestAttempt(): PaymentAttempt | undefined {
    return this.props.metadata.attempts.at(-1);
  }

  startAttempt(input: {
    providerOrderId: string;
    requestId: string;
    expiresAt: Date;
    attempt: number;
    now?: Date;
  }): void {
    if (
      this.status !== PaymentStatusEnum.PENDING &&
      this.status !== PaymentStatusEnum.FAILED
    ) {
      throw new Error('Settled payment cannot be retried');
    }
    this.props.status = PaymentStatusEnum.PENDING;
    this.props.providerOrderId = input.providerOrderId;
    this.props.providerTransId = null;
    this.props.payUrl = null;
    this.props.qrCodeUrl = null;
    this.props.deeplink = null;
    this.props.expiresAt = input.expiresAt;
    this.props.paidAt = null;
    this.props.metadata = {
      ...this.props.metadata,
      attempts: [
        ...this.props.metadata.attempts,
        {
          attempt: input.attempt,
          providerOrderId: input.providerOrderId,
          requestId: input.requestId,
          startedAt: (input.now ?? new Date()).toISOString(),
          phase: 'INITIATING',
        },
      ],
    };
    this.touch();
  }

  recordGatewaySession(input: {
    payUrl: string;
    qrCodeUrl: string | null;
    deeplink: string | null;
  }): void {
    if (this.status !== PaymentStatusEnum.PENDING) {
      throw new Error('Only pending payments can receive a payment session');
    }
    this.props.payUrl = input.payUrl;
    this.props.qrCodeUrl = input.qrCodeUrl;
    this.props.deeplink = input.deeplink;
    this.props.metadata = {
      ...this.props.metadata,
      attempts: this.props.metadata.attempts.map((attempt, index, all) =>
        index === all.length - 1 ? { ...attempt, phase: 'READY' } : attempt,
      ),
    };
    this.touch();
  }

  fail(message?: string, resultCode?: number): boolean {
    if (this.status === PaymentStatusEnum.PAID) return false;
    if (this.status === PaymentStatusEnum.FAILED) return false;
    this.props.status = PaymentStatusEnum.FAILED;
    this.props.metadata = {
      ...this.props.metadata,
      attempts: this.props.metadata.attempts.map((attempt, index, all) =>
        index === all.length - 1
          ? {
              ...attempt,
              ...(message ? { message } : {}),
              ...(resultCode !== undefined ? { resultCode } : {}),
              phase: 'FAILED',
            }
          : attempt,
      ),
    };
    this.touch();
    return true;
  }

  complete(providerTransId: string, paidAt = new Date()): boolean {
    if (
      this.status !== PaymentStatusEnum.PENDING &&
      this.status !== PaymentStatusEnum.FAILED
    ) {
      return false;
    }
    this.props.status = PaymentStatusEnum.PAID;
    this.props.providerTransId = providerTransId;
    this.props.paidAt = paidAt;
    this.touch();
    return true;
  }

  requestRefund(): boolean {
    if (this.status === PaymentStatusEnum.REFUND_PENDING) return false;
    if (this.status !== PaymentStatusEnum.PAID) {
      throw new Error('Only paid payments can be refunded');
    }
    this.props.status = PaymentStatusEnum.REFUND_PENDING;
    this.touch();
    return true;
  }

  completeRefund(): boolean {
    if (this.status === PaymentStatusEnum.REFUNDED) return false;
    if (
      this.status !== PaymentStatusEnum.REFUND_PENDING &&
      this.status !== PaymentStatusEnum.REFUND_FAILED
    ) {
      throw new Error('Payment is not awaiting a refund');
    }
    this.props.status = PaymentStatusEnum.REFUNDED;
    this.touch();
    return true;
  }

  failRefund(): boolean {
    if (this.status === PaymentStatusEnum.REFUND_FAILED) return false;
    if (this.status !== PaymentStatusEnum.REFUND_PENDING) {
      throw new Error('Payment is not awaiting a refund');
    }
    this.props.status = PaymentStatusEnum.REFUND_FAILED;
    this.touch();
    return true;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      orderId: this.orderId,
      provider: this.provider,
      amount: this.amount,
      currency: this.currency,
      status: this.status,
      providerOrderId: this.providerOrderId,
      providerTransId: this.providerTransId,
      payUrl: this.payUrl,
      qrCodeUrl: this.qrCodeUrl,
      deeplink: this.deeplink,
      metadata: this.metadata,
      expiresAt: this.expiresAt,
      paidAt: this.paidAt,
    };
  }
}
