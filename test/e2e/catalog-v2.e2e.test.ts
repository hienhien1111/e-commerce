import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app.helper';
import { cleanDatabase } from './helpers/db.helper';
import { registerAdmin, registerAndLogin } from './helpers/auth.helper';

const credentials = (prefix: string) => ({
  email: `${prefix}-${randomUUID()}@example.com`,
  password: 'Test@1234',
  firstName: 'Catalog',
  lastName: 'Tester',
});

describe('Catalog V2 E2E', () => {
  let app: INestApplication;
  let adminCookie: string;
  let customerCookie: string;

  beforeAll(async () => {
    app = await createTestApp();
    await cleanDatabase(app);
    adminCookie = (await registerAdmin(app, credentials('catalog-v2-admin')))
      .access;
    customerCookie = (
      await registerAndLogin(app, credentials('catalog-v2-customer'))
    ).access;
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  it('creates an option-backed product, reads its projection, and applies idempotent inventory adjustments', async () => {
    const black = randomUUID();
    const white = randomUUID();
    const mediaId = randomUUID();
    await request(app.getHttpServer())
      .post('/api/v2/admin/products')
      .set('Cookie', customerCookie)
      .send({ name: 'Forbidden', variants: [] })
      .expect(403);

    const created = await request(app.getHttpServer())
      .post('/api/v2/admin/products')
      .set('Cookie', adminCookie)
      .send({
        name: 'Áo Catalog V2',
        status: 'ACTIVE',
        media: [
          {
            id: mediaId,
            url: 'https://example.test/catalog-v2.jpg',
            publicId: 'e2e/catalog-v2',
            isPrimary: true,
          },
        ],
        options: [
          {
            code: 'COLOR',
            name: 'Màu sắc',
            values: [
              { id: black, code: 'BLACK', label: 'Đen' },
              { id: white, code: 'WHITE', label: 'Trắng' },
            ],
          },
        ],
        variants: [
          {
            sku: `V2-BLACK-${randomUUID()}`,
            price: 199000,
            optionValueIds: [black],
            mediaIds: [mediaId],
            initialStock: 7,
          },
          {
            sku: `V2-WHITE-${randomUUID()}`,
            price: 219000,
            optionValueIds: [white],
            initialStock: 0,
          },
        ],
      })
      .expect(201);

    expect(created.body).toMatchObject({
      status: 'ACTIVE',
      options: [
        expect.objectContaining({
          code: 'COLOR',
          values: expect.arrayContaining([
            expect.objectContaining({ id: black, code: 'BLACK' }),
          ]),
        }),
      ],
      summary: expect.objectContaining({
        priceMin: 199000,
        priceMax: 219000,
        availableQuantity: 7,
        sellableVariantCount: 2,
      }),
    });
    const blackVariant = created.body.variants.find(
      (item: { optionValueIds: string[] }) =>
        item.optionValueIds.includes(black),
    ) as { id: string };

    await request(app.getHttpServer())
      .get(
        `/api/v2/products?search=Catalog&optionValueIds=${black}&inStock=true`,
      )
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].id).toBe(created.body.id);
      });
    await request(app.getHttpServer())
      .get(`/api/v2/products/${created.body.id}`)
      .expect(200)
      .expect((response) =>
        expect(response.body.summary.availableQuantity).toBe(7),
      );

    const adjustmentKey = `restock-${randomUUID()}`;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await request(app.getHttpServer())
        .post(
          `/api/v2/admin/products/variants/${blackVariant.id}/inventory-adjustments`,
        )
        .set('Cookie', adminCookie)
        .send({
          quantityDelta: 3,
          reason: 'E2E restock',
          idempotencyKey: adjustmentKey,
        })
        .expect(200)
        .expect((response) => {
          expect(response.body.onHand).toBe(10);
          expect(response.body.availableQuantity).toBe(10);
        });
    }

    const concurrentKey = `concurrent-restock-${randomUUID()}`;
    await Promise.all(
      Array.from({ length: 2 }, () =>
        request(app.getHttpServer())
          .post(
            `/api/v2/admin/products/variants/${blackVariant.id}/inventory-adjustments`,
          )
          .set('Cookie', adminCookie)
          .send({
            quantityDelta: 1,
            reason: 'Concurrent idempotency check',
            idempotencyKey: concurrentKey,
          })
          .expect(200),
      ),
    );
    await request(app.getHttpServer())
      .get(`/api/v2/products/${created.body.id}`)
      .expect(200)
      .expect((response) =>
        expect(response.body.summary.availableQuantity).toBe(11),
      );

    const raceSku = `V2-SKU-RACE-${randomUUID()}`;
    const racePayload = (name: string) => ({
      name,
      status: 'ACTIVE',
      variants: [{ sku: raceSku, price: 99_000, initialStock: 1 }],
    });
    const raceResponses = await Promise.all(
      ['Race left', 'Race right'].map((name) =>
        request(app.getHttpServer())
          .post('/api/v2/admin/products')
          .set('Cookie', adminCookie)
          .send(racePayload(name)),
      ),
    );
    expect(raceResponses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    expect(
      raceResponses.find((response) => response.status === 409)?.body,
    ).toMatchObject({ code: 'VARIANT_SKU_CONFLICT' });
  });
});
