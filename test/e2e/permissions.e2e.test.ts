import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { RoleEnum } from '@/domain/enums/role.enum';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { cleanDatabase } from './helpers/db.helper';
import { createTestApp } from './helpers/test-app.helper';
import { registerAdmin, registerAndLogin } from './helpers/auth.helper';

const credentials = (prefix: string) => ({
  email: `${prefix}-${randomUUID()}@example.com`,
  password: 'Test@1234',
  firstName: 'Permission',
  lastName: 'Tester',
});

describe('Permissions E2E', () => {
  let app: INestApplication;
  let customerCookie: string;
  let adminCookie: string;
  let customerEmail: string;

  beforeAll(async () => {
    app = await createTestApp();
    await cleanDatabase(app);
    const customer = credentials('customer');
    customerEmail = customer.email;
    customerCookie = (await registerAndLogin(app, customer)).access;
    adminCookie = (await registerAdmin(app, credentials('admin'))).access;
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  it('assigns the customer role on registration', async () => {
    const prisma = app.get(PrismaService);
    const user = await prisma.user.findFirstOrThrow({
      where: { email: customerEmail },
      include: { roles: { include: { role: true } } },
    });
    expect(
      user.roles.some((link) => link.role.name === RoleEnum.CUSTOMER),
    ).toBe(true);
  });

  it('blocks customers from admin catalog/order APIs and allows an admin', async () => {
    for (const url of [
      '/api/v1/admin/products',
      '/api/v1/admin/categories',
      '/api/v1/admin/orders',
      '/api/v1/admin/stats',
    ]) {
      await request(app.getHttpServer())
        .get(url)
        .set('Cookie', customerCookie)
        .expect(403);
      await request(app.getHttpServer())
        .get(url)
        .set('Cookie', adminCookie)
        .expect(200);
    }
  });
});
