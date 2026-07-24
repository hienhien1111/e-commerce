import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanDatabase } from './helpers/db.helper';
import { createTestApp } from './helpers/test-app.helper';
import { registerAdmin, registerAndLogin } from './helpers/auth.helper';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';

const credentials = (prefix: string) => ({
  email: `${prefix}-${randomUUID()}@example.com`,
  password: 'Test@1234',
  firstName: 'Admin',
  lastName: 'Tester',
});

describe('Admin E2E', () => {
  let app: INestApplication;
  let adminCookie: string;
  let customerCookie: string;
  let customerEmail: string;

  beforeAll(async () => {
    app = await createTestApp();
    await cleanDatabase(app);
    adminCookie = (await registerAdmin(app, credentials('admin'))).access;
    const customer = credentials('customer');
    customerEmail = customer.email;
    customerCookie = (await registerAndLogin(app, customer)).access;
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  it('requires admin privileges for every admin read endpoint', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/products')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/admin/categories')
      .set('Cookie', customerCookie)
      .expect(403);
  });

  it('lists inactive catalog records while public catalog keeps them hidden', async () => {
    const category = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Cookie', adminCookie)
      .send({ name: 'Hidden category', isActive: false })
      .expect(201);
    const product = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Cookie', adminCookie)
      .send({
        name: 'Hidden product',
        price: 100000,
        stock: 2,
        categoryId: category.body.id,
        isActive: false,
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/admin/categories?isActive=false')
      .set('Cookie', adminCookie)
      .expect(200)
      .expect((response) =>
        expect(
          response.body.some(
            (item: { id: string }) => item.id === category.body.id,
          ),
        ).toBe(true),
      );
    await request(app.getHttpServer())
      .get('/api/v1/admin/products?isActive=false&search=Hidden')
      .set('Cookie', adminCookie)
      .expect(200)
      .expect((response) =>
        expect(response.body.data[0].id).toBe(product.body.id),
      );
    await request(app.getHttpServer())
      .get(`/api/v1/products/${product.body.id}`)
      .expect(404);
  });

  it('supports coupon CRUD, user search, and dashboard stats', async () => {
    const coupon = await request(app.getHttpServer())
      .post('/api/v1/coupons')
      .set('Cookie', adminCookie)
      .send({ code: 'ADMIN10', discountType: 'PERCENTAGE', discountValue: 10 })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/coupons/${coupon.body.id}`)
      .set('Cookie', adminCookie)
      .send({ maxDiscount: 20000 })
      .expect(200)
      .expect((response) => expect(response.body.maxDiscount).toBe(20000));
    await request(app.getHttpServer())
      .patch(`/api/v1/coupons/${coupon.body.id}/deactivate`)
      .set('Cookie', adminCookie)
      .expect(200)
      .expect((response) => expect(response.body.isActive).toBe(false));
    await request(app.getHttpServer())
      .get(`/api/v1/users?search=${encodeURIComponent(customerEmail)}`)
      .set('Cookie', adminCookie)
      .expect(200)
      .expect((response) =>
        expect(response.body.data[0].email).toBe(customerEmail),
      );
    await request(app.getHttpServer())
      .get('/api/v1/admin/stats')
      .set('Cookie', adminCookie)
      .expect(200)
      .expect((response) => {
        expect(response.body.totalUsers).toBeGreaterThanOrEqual(2);
        expect(response.body.totalProducts).toBeGreaterThanOrEqual(1);
        expect(response.body).toEqual(
          expect.objectContaining({
            recentOrders: expect.any(Array),
            reservationFailures: expect.any(Number),
            refundPending: expect.any(Number),
            refundFailed: expect.any(Number),
          }),
        );
      });
  });

  it('protects operation monitoring and lets PAYMENT admins retry dead letters', async () => {
    const prisma = app.get(PrismaService);
    const operationId = randomUUID();
    await prisma.outboxMessage.create({
      data: {
        id: operationId,
        aggregateType: 'Order',
        aggregateId: randomUUID(),
        eventType: 'OrderSubmitted',
        payload: {
          orderId: randomUUID(),
          cartId: null,
          cartItemIds: [],
          couponId: null,
        },
        status: 'DEAD_LETTER',
        attempts: 10,
        lastError: 'Synthetic E2E dead letter',
      },
    });
    await request(app.getHttpServer())
      .get('/api/v1/admin/operations')
      .set('Cookie', customerCookie)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/admin/operations?status=DEAD_LETTER')
      .set('Cookie', adminCookie)
      .expect(200)
      .expect((response) =>
        expect(
          response.body.data.some(
            (operation: { id: string }) => operation.id === operationId,
          ),
        ).toBe(true),
      );
    await request(app.getHttpServer())
      .post(`/api/v1/admin/operations/${operationId}/retry`)
      .set('Cookie', adminCookie)
      .expect(200)
      .expect((response) => {
        expect(response.body.id).toBe(operationId);
        expect(response.body.status).toBe('PENDING');
        expect(response.body.attempts).toBe(0);
      });
  });
});
