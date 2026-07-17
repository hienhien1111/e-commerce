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
  firstName: 'Coupon',
  lastName: 'Tester',
});

describe('Coupon E2E', () => {
  let app: INestApplication;
  let adminCookie: string;
  let userCookie: string;
  let couponId: string;

  beforeAll(async () => {
    app = await createTestApp();
    await cleanDatabase(app);
    adminCookie = (await registerAdmin(app, credentials('coupon-admin')))
      .access;
    userCookie = (await registerAndLogin(app, credentials('coupon-user')))
      .access;
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  it('protects coupon administration and creates a capped percentage coupon', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/coupons')
      .send({})
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/coupons')
      .set('Cookie', userCookie)
      .send({})
      .expect(403);
    const created = await request(app.getHttpServer())
      .post('/api/v1/coupons')
      .set('Cookie', adminCookie)
      .send({
        code: 'sale10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        maxDiscount: 30000,
        minOrderAmount: 100000,
      })
      .expect(201);
    couponId = created.body.id;
    expect(created.body.code).toBe('SALE10');
    await request(app.getHttpServer())
      .post('/api/v1/coupons')
      .set('Cookie', adminCookie)
      .send({ code: 'SALE10', discountType: 'FIXED_AMOUNT', discountValue: 1 })
      .expect(409);
  });

  it('validates public coupons without throwing for invalid states', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/coupons/validate?code=SALE10&total=500000')
      .expect(200)
      .expect({ valid: true, discountAmount: 30000 });
    await request(app.getHttpServer())
      .get('/api/v1/coupons/validate?code=SALE10&total=50000')
      .expect(200)
      .expect({
        valid: false,
        discountAmount: 0,
        reason: 'ORDER_BELOW_MINIMUM',
      });
    await request(app.getHttpServer())
      .get('/api/v1/coupons/validate?code=missing&total=500000')
      .expect(200)
      .expect({ valid: false, discountAmount: 0, reason: 'NOT_FOUND' });
  });

  it('returns invalid after deactivate and expiry', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/coupons/${couponId}/deactivate`)
      .set('Cookie', adminCookie)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/coupons/validate?code=SALE10&total=500000')
      .expect(200)
      .expect({ valid: false, discountAmount: 0, reason: 'INACTIVE' });

    const expired = await request(app.getHttpServer())
      .post('/api/v1/coupons')
      .set('Cookie', adminCookie)
      .send({
        code: 'EXPIRED',
        discountType: 'FIXED_AMOUNT',
        discountValue: 10000,
      })
      .expect(201);
    await app.get(PrismaService).coupon.update({
      where: { id: expired.body.id },
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    await request(app.getHttpServer())
      .get('/api/v1/coupons/validate?code=EXPIRED&total=500000')
      .expect(200)
      .expect({ valid: false, discountAmount: 0, reason: 'EXPIRED' });
  });
});
