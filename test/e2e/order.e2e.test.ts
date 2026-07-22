import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { cleanDatabase } from './helpers/db.helper';
import { createTestApp } from './helpers/test-app.helper';
import { registerAdmin, registerAndLogin } from './helpers/auth.helper';

const credentials = (prefix: string) => ({
  email: `${prefix}-${randomUUID()}@example.com`,
  password: 'Test@1234',
  firstName: 'Order',
  lastName: 'Tester',
});
const shippingAddress = {
  fullName: 'Nguyen Van A',
  phone: '0900000000',
  addressLine: '1 Nguyen Trai',
  ward: 'Phuong 1',
  district: 'Quan 1',
  city: 'Ho Chi Minh',
};

describe('Order E2E', () => {
  let app: INestApplication;
  let adminCookie: string;
  let userCookie: string;
  let otherCookie: string;
  let productId: string;
  let couponId: string;
  let orderId: string;

  beforeAll(async () => {
    app = await createTestApp();
    await cleanDatabase(app);
    adminCookie = (await registerAdmin(app, credentials('order-admin'))).access;
    userCookie = (await registerAndLogin(app, credentials('order-user')))
      .access;
    otherCookie = (await registerAndLogin(app, credentials('order-other')))
      .access;
    const product = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Cookie', adminCookie)
      .send({
        name: 'Order product',
        price: 100000,
        stock: 5,
        sku: `ORDER-${randomUUID()}`,
      })
      .expect(201);
    productId = product.body.id;
    const coupon = await request(app.getHttpServer())
      .post('/api/v1/coupons')
      .set('Cookie', adminCookie)
      .send({
        code: 'ORDER10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        maxUsage: 3,
      })
      .expect(201);
    couponId = coupon.body.id;
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  it('requires authentication, checks out atomically, and clears the cart', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .send({ shippingAddress })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Cookie', userCookie)
      .send({ productId, quantity: 2 })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/cart/coupon')
      .set('Cookie', userCookie)
      .send({ code: 'ORDER10' })
      .expect(200);
    const placed = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Cookie', userCookie)
      .send({ shippingAddress })
      .expect(201);
    orderId = placed.body.id;
    expect(placed.body.status).toBe('PENDING');
    expect(placed.body.subtotal).toBe(200000);
    expect(placed.body.discountAmount).toBe(20000);
    expect(placed.body.total).toBe(180000);
    expect(placed.body.items[0].snapshot.name).toBe('Order product');
    expect(placed.body.shippingAddress).toEqual(shippingAddress);
    await request(app.getHttpServer())
      .get('/api/v1/cart')
      .set('Cookie', userCookie)
      .expect(200)
      .expect((response) => expect(response.body.items).toEqual([]));
    const prisma = app.get(PrismaService);
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: productId } }))
        .stock,
    ).toBe(3);
    expect(
      (await prisma.coupon.findUniqueOrThrow({ where: { id: couponId } }))
        .usedCount,
    ).toBe(1);
    expect(
      await prisma.couponUsage.count({ where: { couponId, orderId } }),
    ).toBe(1);
  });

  it('enforces customer ownership and restores stock/coupon use after cancellation', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/orders/${orderId}`)
      .set('Cookie', otherCookie)
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/cancel`)
      .set('Cookie', otherCookie)
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/cancel`)
      .set('Cookie', userCookie)
      .expect(200)
      .expect((response) => expect(response.body.status).toBe('CANCELLED'));
    const prisma = app.get(PrismaService);
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: productId } }))
        .stock,
    ).toBe(5);
    expect(
      (await prisma.coupon.findUniqueOrThrow({ where: { id: couponId } }))
        .usedCount,
    ).toBe(0);
    expect(
      await prisma.couponUsage.count({ where: { couponId, orderId } }),
    ).toBe(0);
  });

  it('keeps cart data when checkout cannot revalidate stock', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Cookie', userCookie)
      .send({ productId, quantity: 1 })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/products/${productId}`)
      .set('Cookie', adminCookie)
      .send({ stock: 0 })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Cookie', userCookie)
      .send({ shippingAddress })
      .expect(422);
    await request(app.getHttpServer())
      .get('/api/v1/cart')
      .set('Cookie', userCookie)
      .expect(200)
      .expect((response) => expect(response.body.items).toHaveLength(1));
    await request(app.getHttpServer())
      .delete('/api/v1/cart')
      .set('Cookie', userCookie)
      .expect(204);
    await request(app.getHttpServer())
      .patch(`/api/v1/products/${productId}`)
      .set('Cookie', adminCookie)
      .send({ stock: 5 })
      .expect(200);
  });

  it('checks out Buy Now without mutating the existing cart or its coupon', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Cookie', userCookie)
      .send({ productId, quantity: 1 })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/cart/coupon')
      .set('Cookie', userCookie)
      .send({ code: 'ORDER10' })
      .expect(200);
    const beforeCart = await request(app.getHttpServer())
      .get('/api/v1/cart')
      .set('Cookie', userCookie)
      .expect(200);
    const placed = await request(app.getHttpServer())
      .post('/api/v1/orders/buy-now')
      .set('Cookie', userCookie)
      .send({
        productId,
        quantity: 1,
        couponCode: 'order10',
        shippingAddress,
        paymentMethod: 'COD',
      })
      .expect(201);
    expect(placed.body).toMatchObject({
      paymentMethod: 'COD',
      subtotal: 100000,
      discountAmount: 10000,
      total: 90000,
    });
    const afterCart = await request(app.getHttpServer())
      .get('/api/v1/cart')
      .set('Cookie', userCookie)
      .expect(200);
    expect(afterCart.body.id).toBe(beforeCart.body.id);
    expect(
      afterCart.body.items.map(
        (item: { id: string; productId: string; quantity: number }) => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
        }),
      ),
    ).toEqual(
      beforeCart.body.items.map(
        (item: { id: string; productId: string; quantity: number }) => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
        }),
      ),
    );
    expect(afterCart.body.coupon?.code).toBe('ORDER10');
    const prisma = app.get(PrismaService);
    expect(
      await prisma.payment.findUnique({ where: { orderId: placed.body.id } }),
    ).toBeNull();
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: productId } }))
        .stock,
    ).toBe(4);
    await request(app.getHttpServer())
      .post(`/api/v1/orders/${placed.body.id}/cancel`)
      .set('Cookie', userCookie)
      .expect(200);
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: productId } }))
        .stock,
    ).toBe(5);
    expect(
      (await prisma.coupon.findUniqueOrThrow({ where: { id: couponId } }))
        .usedCount,
    ).toBe(0);
    await request(app.getHttpServer())
      .delete('/api/v1/cart')
      .set('Cookie', userCookie)
      .expect(204);
  });

  it('protects admin operations and supports status, admin cancellation, filters, and stats', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/orders').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/admin/orders')
      .set('Cookie', userCookie)
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Cookie', userCookie)
      .send({ productId, quantity: 1 })
      .expect(201);
    const placed = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Cookie', userCookie)
      .send({ shippingAddress })
      .expect(201);
    const adminOrderId = placed.body.id;
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/orders/${adminOrderId}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'PROCESSING' })
      .expect(422);
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/orders/${adminOrderId}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'CONFIRMED' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/orders/${adminOrderId}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'PROCESSING' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/orders/${adminOrderId}/cancel`)
      .set('Cookie', adminCookie)
      .expect(200)
      .expect((response) => expect(response.body.status).toBe('CANCELLED'));
    await request(app.getHttpServer())
      .get('/api/v1/admin/orders?status=CANCELLED&limit=50')
      .set('Cookie', adminCookie)
      .expect(200)
      .expect((response) =>
        expect(
          response.body.data.some(
            (order: { id: string }) => order.id === adminOrderId,
          ),
        ).toBe(true),
      );
    await request(app.getHttpServer())
      .get('/api/v1/admin/orders/stats')
      .set('Cookie', adminCookie)
      .expect(200)
      .expect((response) => {
        expect(response.body.counts.CANCELLED).toBeGreaterThanOrEqual(2);
        expect(response.body.totalRevenue).toBe(0);
      });
  });
});
