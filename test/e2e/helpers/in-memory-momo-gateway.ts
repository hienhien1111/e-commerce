import { createMomoIpnSignature } from '@/infrastructure/providers/momo-payment.gateway';
import type {
  MomoGatewaySession,
  MomoInitiationInput,
  MomoWebhookPayload,
  PaymentGatewayPort,
} from '@/application/payment/ports/payment.gateway.port';

const accessKey = 'test-access-key';
const secretKey = 'test-secret-key';
const partnerCode = 'MOMO_TEST';

export class InMemoryMomoGateway implements PaymentGatewayPort {
  readonly initiations: MomoInitiationInput[] = [];
  nextResult: Partial<MomoGatewaySession> | null = null;

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

  sign(payload: Omit<MomoWebhookPayload, 'signature'>): string {
    return createMomoIpnSignature(payload, secretKey, accessKey);
  }

  webhook(
    input: Omit<MomoWebhookPayload, 'signature' | 'partnerCode'>,
  ): MomoWebhookPayload {
    const payload = { ...input, partnerCode };
    return { ...payload, signature: this.sign(payload) };
  }
}
