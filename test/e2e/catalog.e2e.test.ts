import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app.helper';
import { cleanDatabase } from './helpers/db.helper';
import { registerAdmin, registerAndLogin } from './helpers/auth.helper';
import { InMemoryFileStorage } from './helpers/in-memory-file-storage';
import { FILE_STORAGE_PORT } from '@/application/shared/ports/file-storage/file-storage.port.token';

const credentials = (prefix: string) => ({
  email: `${prefix}-${randomUUID()}@example.com`,
  password: 'Test@1234',
  firstName: 'Catalog',
  lastName: 'Tester',
});

describe('Catalog E2E', () => {
  let app: INestApplication;
  let adminCookie: string;
  let rootCategoryId: string;
  let childCategoryId: string;
  let productId: string;

  beforeAll(async () => {
    app = await createTestApp();
    await cleanDatabase(app);
    adminCookie = (await registerAdmin(app, credentials('catalog-admin')))
      .access;
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  it('returns an empty public category list and protects mutations', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/categories')
      .expect(200)
      .expect([]);
    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .send({ name: 'Blocked' })
      .expect(401);

    const userCookie = (
      await registerAndLogin(app, credentials('catalog-user'))
    ).access;
    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Cookie', userCookie)
      .send({ name: 'Blocked' })
      .expect(403);
  });

  it('creates one root and one child category, then rejects a third level', async () => {
    const root = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Cookie', adminCookie)
      .send({ name: 'Điện thoại', sortOrder: 1 })
      .expect(201);
    rootCategoryId = root.body.id;
    expect(root.body.slug).toBe('dien-thoai');

    const child = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Cookie', adminCookie)
      .send({ name: 'Android', parentId: rootCategoryId })
      .expect(201);
    childCategoryId = child.body.id;

    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Cookie', adminCookie)
      .send({ name: 'Third level', parentId: childCategoryId })
      .expect(400);

    const list = await request(app.getHttpServer())
      .get('/api/v1/categories')
      .expect(200);
    expect(list.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: rootCategoryId, parentId: null }),
        expect.objectContaining({
          id: childCategoryId,
          parentId: rootCategoryId,
        }),
      ]),
    );
  });

  it('creates, filters, and protects a product from category deletion', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Cookie', adminCookie)
      .send({
        name: 'Tai nghe Bluetooth',
        price: 199000,
        comparePrice: 249000,
        stock: 5,
        sku: 'TWS-001',
        categoryId: childCategoryId,
      })
      .expect(201);
    productId = created.body.id;
    expect(created.body.price).toBe(199000);
    expect(created.body).not.toHaveProperty('publicId');

    await request(app.getHttpServer())
      .get(
        `/api/v1/products?categoryId=${childCategoryId}&search=Bluetooth&minPrice=100000&maxPrice=200000&limit=1`,
      )
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].id).toBe(productId);
        expect(response.body.nextCursor).toBeNull();
      });

    await request(app.getHttpServer())
      .delete(`/api/v1/categories/${childCategoryId}`)
      .set('Cookie', adminCookie)
      .expect(409);
  });

  it('keeps an active product public after its category is inactive', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/categories/${childCategoryId}`)
      .set('Cookie', adminCookie)
      .send({ isActive: false })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/categories')
      .expect((response) => {
        expect(
          response.body.find(
            (category: { id: string }) => category.id === childCategoryId,
          ),
        ).toBeUndefined();
      });
  });

  it('uploads five product images, promotes the next primary image, and rejects a sixth', async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const webp = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    const uploads = [
      {
        buffer: jpeg,
        filename: '0.jpeg',
        contentType: 'application/octet-stream',
      },
      { buffer: png, filename: '1.png', contentType: 'image/x-png' },
      { buffer: webp, filename: '2.webp', contentType: 'image/webp' },
      { buffer: jpeg, filename: '3.jpg', contentType: 'image/jpeg' },
      { buffer: png, filename: '4.png', contentType: 'image/png' },
    ];
    for (const upload of uploads) {
      await request(app.getHttpServer())
        .post(`/api/v1/products/${productId}/images`)
        .set('Cookie', adminCookie)
        .attach('file', upload.buffer, {
          filename: upload.filename,
          contentType: upload.contentType,
        })
        .expect(201);
    }
    const product = await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}`)
      .expect(200);
    const primary = product.body.images.find(
      (item: { isPrimary: boolean }) => item.isPrimary,
    );
    const fileStorage = app.get<InMemoryFileStorage>(FILE_STORAGE_PORT);
    const primaryStorageId = fileStorage.uploads.find(
      (upload) => upload.file.url === primary.url,
    )?.file.publicId;
    expect(primary).toBeDefined();

    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/images`)
      .set('Cookie', adminCookie)
      .attach('file', webp, {
        filename: 'six.webp',
        contentType: 'application/octet-stream',
      })
      .expect(409);

    await request(app.getHttpServer())
      .delete(`/api/v1/products/${productId}/images/${primary.id}`)
      .set('Cookie', adminCookie)
      .expect(204);
    const afterDelete = await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}`)
      .expect(200);
    expect(afterDelete.body.images).toHaveLength(4);
    expect(
      afterDelete.body.images.filter(
        (item: { isPrimary: boolean }) => item.isPrimary,
      ),
    ).toHaveLength(1);
    expect(fileStorage.deletedPublicIds).toContain(primaryStorageId);
  });

  it('manages manual variants and exposes only sellable variant data publicly', async () => {
    const before = await request(app.getHttpServer())
      .get(`/api/v1/admin/products/${productId}`)
      .set('Cookie', adminCookie)
      .expect(200);
    const defaultVariant = before.body.variants.find(
      (variant: { label: string | null }) => variant.label === null,
    );
    expect(defaultVariant).toBeDefined();
    expect(before.body.images).not.toHaveLength(0);

    await request(app.getHttpServer())
      .patch(`/api/v1/products/${productId}/variants/${defaultVariant.id}`)
      .set('Cookie', adminCookie)
      .send({ label: 'Đen - M' })
      .expect(200)
      .expect((response) => expect(response.body.sku).toBe('TWS-001'));
    const created = await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/variants`)
      .set('Cookie', adminCookie)
      .send({
        label: 'Trắng - L',
        sku: 'TWS-WHITE-L',
        price: 229000,
        comparePrice: 269000,
        stock: 2,
        imageId: before.body.images[0].id,
      })
      .expect(201);
    const whiteLargeVariantId = created.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/variants`)
      .set('Cookie', adminCookie)
      .send({
        label: 'trắng - l',
        sku: 'TWS-WHITE-L-DUPLICATE',
        price: 229000,
        stock: 2,
      })
      .expect(409);

    const publicProduct = await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}`)
      .expect(200);
    expect(publicProduct.body).toMatchObject({
      hasVariants: true,
      priceRange: { min: 199000, max: 229000 },
    });
    expect(publicProduct.body.variants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: whiteLargeVariantId,
          imageId: before.body.images[0].id,
        }),
      ]),
    );

    const userCookie = (
      await registerAndLogin(app, credentials('variant-user'))
    ).access;
    const cart = await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set('Cookie', userCookie)
      .send({ variantId: whiteLargeVariantId, quantity: 1 })
      .expect(201);
    expect(cart.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productId,
          variantId: whiteLargeVariantId,
          product: expect.objectContaining({ label: 'Trắng - L' }),
        }),
      ]),
    );

    await request(app.getHttpServer())
      .patch(`/api/v1/products/${productId}/variants/${whiteLargeVariantId}`)
      .set('Cookie', adminCookie)
      .send({ isActive: false })
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/cart')
      .set('Cookie', userCookie)
      .expect(200)
      .expect((response) => {
        expect(response.body.items[0]).toMatchObject({
          isAvailable: false,
          availabilityReason: 'INACTIVE',
        });
      });
  });

  it('rejects unsupported and oversized uploads, then soft deletes products', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/images`)
      .set('Cookie', adminCookie)
      .attach('file', Buffer.from('GIF89a'), {
        filename: 'bad.gif',
        contentType: 'image/gif',
      })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/images`)
      .set('Cookie', adminCookie)
      .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'large.png',
        contentType: 'image/png',
      })
      .expect(413);

    await request(app.getHttpServer())
      .delete(`/api/v1/products/${productId}`)
      .set('Cookie', adminCookie)
      .expect(204);
    await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}`)
      .expect(404);
  });
});
