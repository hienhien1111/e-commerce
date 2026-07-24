import { randomUUID } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';
import { MomoPaymentGateway } from '@/infrastructure/providers/momo-payment.gateway';

const required = [
  'MOMO_PARTNER_CODE',
  'MOMO_ACCESS_KEY',
  'MOMO_SECRET_KEY',
  'MOMO_SANDBOX_PROVIDER_ORDER_ID',
] as const;
const configured = required.every((name) => Boolean(process.env[name]));
const sandboxDescribe = configured ? describe : describe.skip;

sandboxDescribe('MoMo sandbox smoke', () => {
  it('queries a sandbox transaction without mutating it', async () => {
    const momo = {
      partnerCode: process.env.MOMO_PARTNER_CODE,
      accessKey: process.env.MOMO_ACCESS_KEY,
      secretKey: process.env.MOMO_SECRET_KEY,
      endpoint: process.env.MOMO_ENDPOINT ?? 'https://test-payment.momo.vn',
      ipnUrl:
        process.env.MOMO_IPN_URL ??
        'https://example.invalid/api/v1/webhooks/momo',
      redirectUrl:
        process.env.MOMO_REDIRECT_URL ??
        'https://example.invalid/payment/return',
      paymentExpiryMinutes: 15,
    };
    const config = {
      get: () => momo,
      getOrThrow: () => momo,
    } as unknown as ConfigService;
    const gateway = new MomoPaymentGateway(config);

    const result = await gateway.queryTransaction({
      providerOrderId: process.env.MOMO_SANDBOX_PROVIDER_ORDER_ID!,
      requestId: randomUUID(),
    });

    expect(Number.isInteger(result.resultCode)).toBe(true);
    expect(typeof result.message).toBe('string');
  });
});
