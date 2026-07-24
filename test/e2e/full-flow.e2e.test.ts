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
  firstName: 'Flow',
  lastName: 'Tester',
});

describe('Full commerce flow E2E', () => {
  let app: INestApplication;
  let adminCookie: string;
  let customerCookie: string;
  let secondCustomerCookie: string;
  let productId: string;
  let couponId: string;
  let gateway: InMemoryMomoGateway;

  beforeAll(async () => {
    app = await createTestApp();
    await cleanDatabase(app);
    adminCookie = (await registerAdmin(app, credentials('flow-admin'))).access;
    customerCookie = (await registerAndLogin(app, credentials('flow-customer')))
      .access;
    secondCustomerCookie = (
      await registerAndLogin(app, credentials('flow-customer-2'))
    ).access;
    const category = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Cookie', adminCookie)
      .send({ name: 'Flow category' })
      .expect(201);
    const product = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Cookie', adminCookie)
      .send({
        name: 'Flow product',
        price: 100000,
        stock: 5,
        categoryId: category.body.id,
      })
      .expect(201);
    productId = product.body.id;
    const coupon = await request(app.getHttpServer())
      .post('/api/v1/coupons')
      .set('Cookie', adminCookie)
      .send({
        code: 'ONEUSE',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        maxUsage: 1,
      })
      .expect(201);
    couponId = coupon.body.id;
    gateway = app.get<InMemoryMomoGateway>(PAYMENT_GATEWAY_PORT);
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  function momoSuccess(orderId: string) {
    const input = gateway.initiations.find(
      (item) =>
        item.extraData ===
        Buffer.from(JSON.stringify({ orderId })).toString('base64'),
    );
    if (!input) throw new Error('Expected payment initiation');
    return gateway.webhook({
      orderId: input.providerOrderId,
      requestId: input.requestId,
      amount: 90000,
      orderInfo: `Thanh toan don hang ${orderId}`,
      orderType: 'momo_wallet',
      transId: `flow-${randomUUID()}`,
      resultCode: 0,
      message: 'Successful.',
      payType: 'qr',
      responseTime: Date.now(),
      extraData: input.extraData,
    });
  }

  it('runs catalog → cart/coupon → order → IPN → delivered and rejects an exhausted coupon immediately', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Cookie', customerCookie)
      .send({ productId, quantity: 1 })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/cart/coupon')
      .set('Cookie', customerCookie)
      .send({ code: 'ONEUSE' })
      .expect(200);
    const firstOrder = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Cookie', customerCookie)
      .send({ shippingAddress, paymentMethod: 'MOMO' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .set('Cookie', customerCookie)
      .send({ orderId: firstOrder.body.id })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/momo')
      .send(momoSuccess(firstOrder.body.id))
      .expect(200);
    for (const status of ['PROCESSING', 'SHIPPED', 'DELIVERED']) {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/orders/${firstOrder.body.id}/status`)
        .set('Cookie', adminCookie)
        .send({ status })
        .expect(200);
    }

    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Cookie', secondCustomerCookie)
      .send({ productId, quantity: 1 })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/cart/coupon')
      .set('Cookie', secondCustomerCookie)
      .send({ code: 'ONEUSE' })
      .expect(422);
    await request(app.getHttpServer())
      .get('/api/v1/cart')
      .set('Cookie', secondCustomerCookie)
      .expect(200)
      .expect((response) => expect(response.body.items).toHaveLength(1));
    expect(
      (
        await app
          .get(PrismaService)
          .coupon.findUniqueOrThrow({ where: { id: couponId } })
      ).usedCount,
    ).toBe(1);
  });

  it('restocks a later cancelled order without releasing a coupon used by a delivered order', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Cookie', customerCookie)
      .send({ productId, quantity: 1 })
      .expect(201);
    const order = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Cookie', customerCookie)
      .send({ shippingAddress })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/orders/${order.body.id}/cancel`)
      .set('Cookie', customerCookie)
      .expect(200);
    const prisma = app.get(PrismaService);
    await waitFor(
      () => prisma.order.findUniqueOrThrow({ where: { id: order.body.id } }),
      (current) => current.reservationStatus === 'RELEASED',
    );
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: productId } }))
        .stock,
    ).toBe(4);
    expect(
      (await prisma.coupon.findUniqueOrThrow({ where: { id: couponId } }))
        .usedCount,
    ).toBe(1);
  });
});
