import { PaymentFactory } from '@/domain/factories/payment.factory';
import { PaymentStatusEnum } from '@/domain/enums/payment-status.enum';

const createPayment = () =>
  PaymentFactory.create({
    orderId: 'order-1',
    provider: 'momo',
    amount: 100000,
    currency: 'VND',
    status: PaymentStatusEnum.PENDING,
    providerOrderId: null,
    providerTransId: null,
    payUrl: null,
    qrCodeUrl: null,
    deeplink: null,
    metadata: { attempts: [] },
    expiresAt: null,
    paidAt: null,
  });

describe('Payment', () => {
  it('records a reusable pending session and starts an auditable retry', () => {
    const payment = createPayment();
    const now = new Date('2026-01-01T00:00:00.000Z');
    payment.startAttempt({
      providerOrderId: 'momo-order-1-1',
      requestId: 'request-1',
      expiresAt: new Date('2026-01-01T00:15:00.000Z'),
      attempt: 1,
      now,
    });
    payment.recordGatewaySession({
      payUrl: 'https://momo.test/pay',
      qrCodeUrl: 'qr-data',
      deeplink: null,
    });
    expect(payment.isReusable(new Date('2026-01-01T00:01:00.000Z'))).toBe(true);
    expect(payment.fail('expired', 1006)).toBe(true);
    payment.startAttempt({
      providerOrderId: 'momo-order-1-2',
      requestId: 'request-2',
      expiresAt: new Date('2026-01-01T00:30:00.000Z'),
      attempt: 2,
      now,
    });
    expect(payment.status).toBe(PaymentStatusEnum.PENDING);
    expect(payment.metadata.attempts).toHaveLength(2);
  });

  it('makes PAID terminal', () => {
    const payment = createPayment();
    expect(payment.complete('provider-transaction')).toBe(true);
    expect(payment.complete('another-transaction')).toBe(false);
    expect(payment.fail('late failure')).toBe(false);
    expect(() =>
      payment.startAttempt({
        providerOrderId: 'momo-order-1-2',
        requestId: 'request-2',
        expiresAt: new Date(Date.now() + 60_000),
        attempt: 2,
      }),
    ).toThrow('cannot be retried');
  });
});
