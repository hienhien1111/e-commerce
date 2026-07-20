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
  const image = Buffer.from('catalog-image');

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
    for (let index = 0; index < 5; index += 1) {
      await request(app.getHttpServer())
        .post(`/api/v1/products/${productId}/images`)
        .set('Cookie', adminCookie)
        .attach('file', image, {
          filename: `${index}.webp`,
          contentType: 'image/webp',
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
      .attach('file', image, {
        filename: 'six.webp',
        contentType: 'image/webp',
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

  it('rejects unsupported and oversized uploads, then soft deletes products', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/images`)
      .set('Cookie', adminCookie)
      .attach('file', image, { filename: 'bad.gif', contentType: 'image/gif' })
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
