import { createMomoIpnSignature } from '@/infrastructure/providers/momo-payment.gateway';
import type {
  MomoGatewaySession,
  MomoInitiationInput,
  MomoRefundInput,
  MomoRefundResult,
  MomoTransactionQueryResult,
  MomoWebhookPayload,
  PaymentGatewayPort,
} from '@/application/payment/ports/payment.gateway.port';

const accessKey = 'test-access-key';
const secretKey = 'test-secret-key';
const partnerCode = 'MOMO_TEST';

export class InMemoryMomoGateway implements PaymentGatewayPort {
  readonly initiations: MomoInitiationInput[] = [];
  readonly refunds: MomoRefundInput[] = [];
  readonly refundedByProviderOrderId = new Map<string, number>();
  readonly transactionByProviderOrderId = new Map<string, string>();
  nextResult: Partial<MomoGatewaySession> | null = null;
  nextQueryError: Error | null = null;
  nextRefundError: Error | null = null;

  isConfigured(): boolean {
    return true;
  }

  async initiate(input: MomoInitiationInput): Promise<MomoGatewaySession> {
    this.initiations.push(input);
    const next = this.nextResult;
    this.nextResult = null;
    return {
      resultCode: next?.resultCode ?? 0,
      message: next?.message ?? 'Successful.',
      payUrl: next?.payUrl ?? `https://momo.test/pay/${input.providerOrderId}`,
      qrCodeUrl: next?.qrCodeUrl ?? `momo-qr:${input.providerOrderId}`,
      deeplink: next?.deeplink ?? `momo://pay/${input.providerOrderId}`,
    };
  }

  verifyWebhook(payload: MomoWebhookPayload): boolean {
    return (
      payload.partnerCode === partnerCode &&
      this.sign(payload) === payload.signature
    );
  }

  async queryTransaction(input: {
    providerOrderId: string;
  }): Promise<MomoTransactionQueryResult> {
    if (this.nextQueryError) {
      const error = this.nextQueryError;
      this.nextQueryError = null;
      throw error;
    }
    return {
      resultCode: 0,
      message: 'Successful.',
      refundedAmount:
        this.refundedByProviderOrderId.get(input.providerOrderId) ?? 0,
    };
  }

  async refund(input: MomoRefundInput): Promise<MomoRefundResult> {
    if (this.nextRefundError) {
      const error = this.nextRefundError;
      this.nextRefundError = null;
      throw error;
    }
    this.refunds.push(input);
    const providerOrderId = [
      ...this.transactionByProviderOrderId.entries(),
    ].find(([, transId]) => transId === input.providerTransId)?.[0];
    if (providerOrderId) {
      this.refundedByProviderOrderId.set(
        providerOrderId,
        (this.refundedByProviderOrderId.get(providerOrderId) ?? 0) +
          input.amount,
      );
    }
    return {
      resultCode: 0,
      message: 'Successful.',
      refundTransId: `refund-${this.refunds.length}`,
    };
  }

  sign(payload: Omit<MomoWebhookPayload, 'signature'>): string {
    return createMomoIpnSignature(payload, secretKey, accessKey);
  }

  webhook(
    input: Omit<MomoWebhookPayload, 'signature' | 'partnerCode'>,
  ): MomoWebhookPayload {
    const payload = { ...input, partnerCode };
    if (input.resultCode === 0) {
      this.transactionByProviderOrderId.set(input.orderId, input.transId);
    }
    return { ...payload, signature: this.sign(payload) };
  }
}
