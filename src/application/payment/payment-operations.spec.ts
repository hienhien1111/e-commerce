import { InitiatePaymentHandler } from '@/application/payment/commands/initiate-payment/initiate-payment.handler';
import { SettleMomoWebhookHandler } from '@/application/payment/commands/settle-momo-webhook/settle-momo-webhook.handler';
import { GetPaymentForOrderHandler } from '@/application/payment/queries/get-payment-for-order/get-payment-for-order.handler';
import { OrderStatusEnum } from '@/domain/enums/order-status.enum';
import { PaymentMethodEnum } from '@/domain/enums/payment-method.enum';
import { PaymentStatusEnum } from '@/domain/enums/payment-status.enum';
import { OrderItemFactory } from '@/domain/factories/order-item.factory';
import { OrderFactory } from '@/domain/factories/order.factory';
import { PaymentFactory } from '@/domain/factories/payment.factory';

const order = (overrides: Partial<Record<string, unknown>> = {}) =>
  OrderFactory.create({
    id: 'order-1',
    userId: 'user-1',
    status: OrderStatusEnum.PENDING,
    subtotal: 100_000,
    discountAmount: 0,
    total: 100_000,
    paymentMethod: PaymentMethodEnum.MOMO,
    paymentStatus: PaymentStatusEnum.PENDING,
    shippingAddress: {
      fullName: 'Tester',
      phone: '0900000000',
      addressLine: '1 Main',
      ward: 'Ward',
      district: 'District',
      city: 'City',
    },
    couponId: null,
    note: null,
    items: [
      OrderItemFactory.create({
        productId: 'product-1',
        quantity: 1,
        unitPrice: 100_000,
        totalPrice: 100_000,
        snapshot: { name: 'Product', sku: null, imageUrl: null },
      }),
    ],
    ...overrides,
  } as never);

const payment = (status = PaymentStatusEnum.PENDING) =>
  PaymentFactory.create({
    id: 'payment-1',
    orderId: 'order-1',
    provider: 'momo',
    amount: 100_000,
    currency: 'VND',
    status,
    providerOrderId: 'momo-order-1',
    providerTransId: null,
    payUrl: null,
    qrCodeUrl: null,
    deeplink: null,
    metadata: { attempts: [] },
    expiresAt: null,
    paidAt: null,
  });

const webhookPayload = {
  partnerCode: 'MOMO',
  orderId: 'momo-order-1',
  requestId: 'request-1',
  amount: 100_000,
  orderInfo: 'Order',
  orderType: 'momo_wallet',
  transId: 'transaction-1',
  resultCode: 0,
  message: 'Success',
  payType: 'qr',
  responseTime: Date.now(),
  extraData: '',
  signature: 'signature',
};

describe('Payment application operations', () => {
  it('rejects payment initiation when the gateway is not configured', async () => {
    const handler = new InitiatePaymentHandler(
      { findById: jest.fn() } as never,
      {} as never,
      { isConfigured: jest.fn().mockReturnValue(false) } as never,
      {} as never,
      {} as never,
    );
    await expect(
      handler.execute({ orderId: 'order-1', userId: 'user-1' }),
    ).rejects.toMatchObject({
      code: 'MOMO_NOT_CONFIGURED',
      kind: 'UNAVAILABLE',
    });
  });

  it('reuses an active payment reservation without calling MoMo again', async () => {
    const activePayment = payment();
    const orders = { findById: jest.fn().mockResolvedValue(order()) };
    const payments = {
      reserveMomoInitiation: jest.fn().mockResolvedValue({
        state: 'REUSE',
        payment: activePayment,
      }),
    };
    const gateway = {
      isConfigured: jest.fn().mockReturnValue(true),
      initiate: jest.fn(),
    };
    const config = {
      getOrThrow: jest.fn().mockReturnValue({ paymentExpiryMinutes: 15 }),
    };
    const handler = new InitiatePaymentHandler(
      orders as never,
      payments as never,
      gateway as never,
      config as never,
    );

    await expect(
      handler.execute({ orderId: 'order-1', userId: 'user-1' }),
    ).resolves.toBe(activePayment);
    expect(gateway.initiate).not.toHaveBeenCalled();
  });

  it('starts a signed MoMo session after reservation succeeds', async () => {
    const reserved = payment();
    const orders = { findById: jest.fn().mockResolvedValue(order()) };
    const payments = {
      reserveMomoInitiation: jest.fn().mockResolvedValue({
        state: 'INITIATE',
        payment: reserved,
        providerOrderId: 'momo-order-1',
        requestId: 'request-1',
      }),
      completeMomoInitiation: jest.fn().mockResolvedValue(reserved),
    };
    const gateway = {
      isConfigured: jest.fn().mockReturnValue(true),
      initiate: jest.fn().mockResolvedValue({
        resultCode: 0,
        message: 'ok',
        payUrl: 'https://momo.test/pay',
        qrCodeUrl: 'qr',
        deeplink: null,
      }),
    };
    const config = {
      getOrThrow: jest.fn().mockReturnValue({
        paymentExpiryMinutes: 15,
        redirectUrl: 'http://localhost/payment/return',
        ipnUrl: 'https://example.test/ipn',
      }),
    };
    const handler = new InitiatePaymentHandler(
      orders as never,
      payments as never,
      gateway as never,
      config as never,
    );

    await expect(
      handler.execute({ orderId: 'order-1', userId: 'user-1' }),
    ).resolves.toBe(reserved);
    expect(payments.completeMomoInitiation).toHaveBeenCalled();
  });

  it('rejects invalid webhooks and delegates verified outcomes', async () => {
    const gateway = { verifyWebhook: jest.fn().mockReturnValue(false) };
    const settlement = { settleMomoWebhook: jest.fn() };
    const handler = new SettleMomoWebhookHandler(
      gateway as never,
      settlement as never,
    );

    await expect(
      handler.execute({ payload: webhookPayload }),
    ).rejects.toMatchObject({
      code: 'MOMO_SIGNATURE_INVALID',
      kind: 'UNAUTHORIZED',
    });
    gateway.verifyWebhook.mockReturnValueOnce(true);
    settlement.settleMomoWebhook.mockResolvedValueOnce({
      changed: true,
      payment: payment(PaymentStatusEnum.PAID),
    });
    await handler.execute({ payload: webhookPayload });
    expect(settlement.settleMomoWebhook).toHaveBeenCalledTimes(1);
  });

  it('enforces payment ownership and payment method on payment reads', async () => {
    const orders = { findById: jest.fn().mockResolvedValue(order()) };
    const payments = { findByOrderId: jest.fn().mockResolvedValue(payment()) };
    const handler = new GetPaymentForOrderHandler(
      orders as never,
      payments as never,
    );

    await expect(
      handler.execute({ userId: 'other', orderId: 'order-1' }),
    ).rejects.toMatchObject({ code: 'PAYMENT_FORBIDDEN', kind: 'FORBIDDEN' });
    orders.findById.mockResolvedValueOnce(
      order({ paymentMethod: PaymentMethodEnum.COD }),
    );
    await expect(
      handler.execute({ userId: 'user-1', orderId: 'order-1' }),
    ).rejects.toMatchObject({
      code: 'PAYMENT_METHOD_NOT_MOMO',
      kind: 'UNPROCESSABLE',
    });
    orders.findById.mockResolvedValueOnce(null);
    await expect(
      handler.execute({ userId: 'user-1', orderId: 'missing' }),
    ).rejects.toMatchObject({ code: 'ORDER_NOT_FOUND', kind: 'NOT_FOUND' });
  });
});
