import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { PAYMENT_GATEWAY_PORT } from '@/application/payment/ports/payment.gateway.port.token';
import { InMemoryMomoGateway } from './helpers/in-memory-momo-gateway';
import { cleanDatabase, waitFor } from './helpers/db.helper';
import { createTestApp } from './helpers/test-app.helper';
import { registerAdmin, registerAndLogin } from './helpers/auth.helper';

const shippingAddress = {
  fullName: 'Nguyen Van A',
  phone: '0900000000',
  addressLine: '1 Nguyen Trai',
  ward: 'Phuong 1',
  district: 'Quan 1',
  city: 'Ho Chi Minh',
};
const credentials = (prefix: string) => ({
  email: `${prefix}-${randomUUID()}@example.com`,
  password: 'Test@1234',
  firstName: 'Payment',
  lastName: 'Tester',
});

describe('Payment E2E', () => {
  let app: INestApplication;
  let adminCookie: string;
  let userCookie: string;
  let otherCookie: string;
  let productId: string;
  let gateway: InMemoryMomoGateway;

  beforeAll(async () => {
    app = await createTestApp();
    await cleanDatabase(app);
    adminCookie = (await registerAdmin(app, credentials('payment-admin')))
      .access;
    userCookie = (await registerAndLogin(app, credentials('payment-user')))
      .access;
    otherCookie = (await registerAndLogin(app, credentials('payment-other')))
      .access;
    const product = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Cookie', adminCookie)
      .send({
        name: 'Payment product',
        price: 100000,
        stock: 20,
        sku: `PAY-${randomUUID()}`,
      })
      .expect(201);
    productId = product.body.id;
    gateway = app.get<InMemoryMomoGateway>(PAYMENT_GATEWAY_PORT);
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  async function createOrder(): Promise<string> {
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Cookie', userCookie)
      .send({ productId, quantity: 1 })
      .expect(201);
    const placed = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Cookie', userCookie)
      .send({ shippingAddress, paymentMethod: 'MOMO' })
      .expect(201);
    return placed.body.id;
  }

  function webhook(orderId: string, resultCode = 0, amount = 100000) {
    const input = gateway.initiations.find(
      (item) =>
        item.extraData ===
        Buffer.from(JSON.stringify({ orderId })).toString('base64'),
    );
    if (!input) throw new Error('Expected a MoMo initiation');
    return gateway.webhook({
      orderId: input.providerOrderId,
      requestId: input.requestId,
      amount,
      orderInfo: `Thanh toan don hang ${orderId}`,
      orderType: 'momo_wallet',
      transId: `trans-${randomUUID()}`,
      resultCode,
      message: resultCode === 0 ? 'Successful.' : 'Declined.',
      payType: 'qr',
      responseTime: Date.now(),
      extraData: input.extraData,
    });
  }

  it('requires auth, enforces ownership, and reuses a pending session', async () => {
    const orderId = await createOrder();
    await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .send({ orderId })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .set('Cookie', otherCookie)
      .send({ orderId })
      .expect(403);

    const first = await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .set('Cookie', userCookie)
      .send({ orderId })
      .expect(201);
    expect(first.body).toMatchObject({
      orderId,
      provider: 'momo',
      amount: 100000,
      status: 'PENDING',
    });
    expect(first.body).not.toHaveProperty('providerOrderId');
    expect(first.body).not.toHaveProperty('metadata');
    const count = gateway.initiations.length;
    await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .set('Cookie', userCookie)
      .send({ orderId })
      .expect(201)
      .expect((response) => expect(response.body.id).toBe(first.body.id));
    expect(gateway.initiations).toHaveLength(count);
    await request(app.getHttpServer())
      .get(`/api/v1/payments/order/${orderId}`)
      .set('Cookie', otherCookie)
      .expect(403);
    await request(app.getHttpServer())
      .get(`/api/v1/payments/order/${orderId}`)
      .set('Cookie', userCookie)
      .expect(200)
      .expect((response) => expect(response.body.id).toBe(first.body.id));
  });

  it('reserves one MoMo gateway call for concurrent initiation requests', async () => {
    const orderId = await createOrder();
    const before = gateway.initiations.length;
    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/payments/initiate')
        .set('Cookie', userCookie)
        .send({ orderId }),
      request(app.getHttpServer())
        .post('/api/v1/payments/initiate')
        .set('Cookie', userCookie)
        .send({ orderId }),
    ]);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.id).toBe(second.body.id);
    expect(gateway.initiations).toHaveLength(before + 1);
  });

  it('does not initiate payment records for COD orders', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Cookie', userCookie)
      .send({ productId, quantity: 1 })
      .expect(201);
    const order = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Cookie', userCookie)
      .send({ shippingAddress, paymentMethod: 'COD' })
      .expect(201);
    expect(order.body.paymentMethod).toBe('COD');
    await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .set('Cookie', userCookie)
      .send({ orderId: order.body.id })
      .expect(422)
      .expect((response) =>
        expect(response.body).toMatchObject({
          code: 'PAYMENT_METHOD_NOT_MOMO',
          retryable: false,
        }),
      );
    const prisma = app.get(PrismaService);
    expect(
      await prisma.payment.findUnique({ where: { orderId: order.body.id } }),
    ).toBeNull();
  });

  it('settles valid IPNs once and confirms the order without exposing provider data', async () => {
    const orderId = await createOrder();
    await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .set('Cookie', userCookie)
      .send({ orderId })
      .expect(201);
    const callback = webhook(orderId);
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/momo')
      .send(callback)
      .expect(200)
      .expect({ message: 'ok' });
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/momo')
      .send(callback)
      .expect(200);
    const prisma = app.get(PrismaService);
    const payment = await prisma.payment.findUniqueOrThrow({
      where: { orderId },
    });
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    expect(payment.status).toBe('PAID');
    expect(payment.providerTransId).toBe(callback.transId);
    expect(order.paymentStatus).toBe('PAID');
    expect(order.status).toBe('CONFIRMED');
  });

  it('rejects forged signatures, ignores amount mismatches, and allows a failed payment retry', async () => {
    const orderId = await createOrder();
    await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .set('Cookie', userCookie)
      .send({ orderId })
      .expect(201);
    const invalid = webhook(orderId);
    invalid.signature = 'not-a-valid-signature';
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/momo')
      .send(invalid)
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/momo')
      .send(webhook(orderId, 0, 1))
      .expect(200);
    const prisma = app.get(PrismaService);
    expect(
      (await prisma.payment.findUniqueOrThrow({ where: { orderId } })).status,
    ).toBe('PENDING');

    await request(app.getHttpServer())
      .post('/api/v1/webhooks/momo')
      .send(webhook(orderId, 1006))
      .expect(200);
    expect(
      (await prisma.payment.findUniqueOrThrow({ where: { orderId } })).status,
    ).toBe('FAILED');
    const priorCalls = gateway.initiations.length;
    await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .set('Cookie', userCookie)
      .send({ orderId })
      .expect(201)
      .expect((response) => expect(response.body.status).toBe('PENDING'));
    expect(gateway.initiations).toHaveLength(priorCalls + 1);
  });

  it('keeps a cancelled order cancelled and refunds a late success IPN exactly once', async () => {
    const orderId = await createOrder();
    await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .set('Cookie', userCookie)
      .send({ orderId })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/cancel`)
      .set('Cookie', userCookie)
      .expect(200);
    const callback = webhook(orderId);
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/momo')
      .send(callback)
      .expect(200);
    const prisma = app.get(PrismaService);
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/momo')
      .send(callback)
      .expect(200);
    const order = await waitFor(
      () => prisma.order.findUniqueOrThrow({ where: { id: orderId } }),
      (current) => current.paymentStatus === 'REFUNDED',
    );
    expect(order.status).toBe('CANCELLED');
    expect(order.paymentStatus).toBe('REFUNDED');
    expect(order.paidAt).toBeInstanceOf(Date);
    expect(
      gateway.refunds.filter((refund) => refund.amount === 100000),
    ).toHaveLength(1);
    expect(
      await prisma.paymentRefund.count({
        where: { payment: { orderId } },
      }),
    ).toBe(1);
  });

  it('expires unpaid MoMo reservations and releases inventory exactly once', async () => {
    const orderId = await createOrder();
    const prisma = app.get(PrismaService);
    const stockBeforeExpiry = (
      await prisma.product.findUniqueOrThrow({ where: { id: productId } })
    ).stock;
    await prisma.order.update({
      where: { id: orderId },
      data: { reservationExpiresAt: new Date(Date.now() - 1_000) },
    });
    const expired = await waitFor(
      () => prisma.order.findUniqueOrThrow({ where: { id: orderId } }),
      (order) =>
        order.status === 'CANCELLED' && order.reservationStatus === 'RELEASED',
    );
    expect(expired.cancellationReason).toBe('PAYMENT_EXPIRED');
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: productId } }))
        .stock,
    ).toBe(stockBeforeExpiry + 1);
    await new Promise((resolve) => setTimeout(resolve, 1_200));
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: productId } }))
        .stock,
    ).toBe(stockBeforeExpiry + 1);
  });
});
