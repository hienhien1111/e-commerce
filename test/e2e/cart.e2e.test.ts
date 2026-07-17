import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanDatabase } from './helpers/db.helper';
import { createTestApp } from './helpers/test-app.helper';
import { registerAdmin, registerAndLogin } from './helpers/auth.helper';

const credentials = (prefix: string) => ({
  email: `${prefix}-${randomUUID()}@example.com`,
  password: 'Test@1234',
  firstName: 'Cart',
  lastName: 'Tester',
});

describe('Cart E2E', () => {
  let app: INestApplication;
  let adminCookie: string;
  let userCookie: string;
  let productId: string;

  beforeAll(async () => {
    app = await createTestApp();
    await cleanDatabase(app);
    adminCookie = (await registerAdmin(app, credentials('cart-admin'))).access;
    userCookie = (await registerAndLogin(app, credentials('cart-user'))).access;
    await request(app.getHttpServer())
      .post('/api/v1/coupons')
      .set('Cookie', adminCookie)
      .send({
        code: 'CART10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
      })
      .expect(201);
    const product = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Cookie', adminCookie)
      .send({ name: 'Cart product', price: 100000, stock: 4 })
      .expect(201);
    productId = product.body.id;
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  it('requires authentication and returns an empty cart for a new customer', async () => {
    await request(app.getHttpServer()).get('/api/v1/cart').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/cart')
      .set('Cookie', userCookie)
      .expect(200)
      .expect({
        id: null,
        items: [],
        itemCount: 0,
        subtotal: 0,
        discountAmount: 0,
        total: 0,
        checkoutReady: false,
        coupon: null,
      });
  });

  it('adds, increments, updates, and removes cart items', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Cookie', userCookie)
      .send({ productId, quantity: 1 })
      .expect(201)
      .expect((response) => expect(response.body.itemCount).toBe(1));
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Cookie', userCookie)
      .send({ productId, quantity: 2 })
      .expect(201)
      .expect((response) => expect(response.body.items[0].quantity).toBe(3));
    await request(app.getHttpServer())
      .patch(`/api/v1/cart/items/${productId}`)
      .set('Cookie', userCookie)
      .send({ quantity: 2 })
      .expect(200)
      .expect((response) => expect(response.body.total).toBe(200000));
    await request(app.getHttpServer())
      .post('/api/v1/cart/coupon')
      .set('Cookie', userCookie)
      .send({ code: 'CART10' })
      .expect(200)
      .expect((response) => {
        expect(response.body.discountAmount).toBe(20000);
        expect(response.body.coupon.code).toBe('CART10');
      });
    await request(app.getHttpServer())
      .delete('/api/v1/cart/coupon')
      .set('Cookie', userCookie)
      .expect(200)
      .expect((response) => expect(response.body.coupon).toBeNull());
    await request(app.getHttpServer())
      .delete(`/api/v1/cart/items/${productId}`)
      .set('Cookie', userCookie)
      .expect(204);
  });

  it('keeps an unavailable item for warning while rejecting new additions', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Cookie', userCookie)
      .send({ productId, quantity: 2 })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/products/${productId}`)
      .set('Cookie', adminCookie)
      .send({ isActive: false })
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/cart')
      .set('Cookie', userCookie)
      .expect(200)
      .expect((response) => {
        expect(response.body.items[0].isAvailable).toBe(false);
        expect(response.body.items[0].availabilityReason).toBe('INACTIVE');
        expect(response.body.checkoutReady).toBe(false);
      });
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Cookie', userCookie)
      .send({ productId, quantity: 1 })
      .expect(404);
    await request(app.getHttpServer())
      .delete('/api/v1/cart')
      .set('Cookie', userCookie)
      .expect(204);
  });
});
