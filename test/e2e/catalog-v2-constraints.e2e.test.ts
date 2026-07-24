import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { createTestApp } from './helpers/test-app.helper';
import { cleanDatabase } from './helpers/db.helper';

const productData = (
  overrides: Partial<Prisma.ProductUncheckedCreateInput> = {},
): Prisma.ProductUncheckedCreateInput => ({
  id: randomUUID(),
  name: `Constraint product ${randomUUID()}`,
  slug: `constraint-${randomUUID()}`,
  price: 100_000,
  stock: 0,
  isActive: false,
  status: 'DRAFT' as const,
  ...overrides,
});

const variantData = (
  productId: string,
  overrides: Partial<Prisma.ProductVariantUncheckedCreateInput> = {},
): Prisma.ProductVariantUncheckedCreateInput => ({
  id: randomUUID(),
  productId,
  sku: `CONSTRAINT-${randomUUID()}`,
  price: 100_000,
  stock: 0,
  isActive: true,
  status: 'ACTIVE' as const,
  combinationKey: 'DEFAULT',
  currency: 'VND',
  ...overrides,
});

describe('Catalog V2 PostgreSQL constraints', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await cleanDatabase(app);
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  it('enforces SKU immutability and an active product always has a sellable variant', async () => {
    await expect(
      Promise.resolve(
        prisma.product.create({
          data: productData({ status: 'ACTIVE', isActive: true }),
        }),
      ),
    ).rejects.toThrow();

    const product = await prisma.product.create({ data: productData() });
    const variant = await prisma.productVariant.create({
      data: variantData(product.id),
    });
    await prisma.product.update({
      where: { id: product.id },
      data: { status: 'ACTIVE', isActive: true, publishedAt: new Date() },
    });

    await expect(
      Promise.resolve(
        prisma.productVariant.update({
          where: { id: variant.id },
          data: { sku: `MUTATED-${randomUUID()}` },
        }),
      ),
    ).rejects.toThrow();
    await expect(
      Promise.resolve(
        prisma.productVariant.update({
          where: { id: variant.id },
          data: { status: 'ARCHIVED', isActive: false, deletedAt: new Date() },
        }),
      ),
    ).rejects.toThrow();
  });

  it('rejects incomplete option combinations and media from another product', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        const product = await tx.product.create({ data: productData() });
        const option = await tx.productOption.create({
          data: {
            id: randomUUID(),
            productId: product.id,
            code: 'SIZE',
            name: 'Kích cỡ',
          },
        });
        await tx.productOptionValue.create({
          data: {
            id: randomUUID(),
            productOptionId: option.id,
            code: 'M',
            label: 'M',
          },
        });
        await tx.productVariant.create({
          data: variantData(product.id, { combinationKey: 'OPT:missing' }),
        });
      }),
    ).rejects.toThrow();

    const left = await prisma.product.create({ data: productData() });
    const right = await prisma.product.create({ data: productData() });
    const leftVariant = await prisma.productVariant.create({
      data: variantData(left.id),
    });
    const foreignMedia = await prisma.productMedia.create({
      data: {
        id: randomUUID(),
        productId: right.id,
        url: 'https://example.test/foreign-media.jpg',
        publicId: `foreign-media-${randomUUID()}`,
        isPrimary: true,
      },
    });

    await expect(
      Promise.resolve(
        prisma.productVariantMedia.create({
          data: {
            variantId: leftVariant.id,
            productId: left.id,
            mediaId: foreignMedia.id,
          },
        }),
      ),
    ).rejects.toThrow();
  });
});
