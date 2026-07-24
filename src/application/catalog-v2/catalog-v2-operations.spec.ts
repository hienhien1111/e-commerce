import { describe, expect, it, jest } from 'bun:test';
import { CreateCatalogProductV2Handler } from '@/application/catalog-v2/commands/create-catalog-product-v2.handler';
import { UpdateCatalogProductV2Handler } from '@/application/catalog-v2/commands/update-catalog-product-v2.handler';
import { AdjustInventoryHandler } from '@/application/catalog-v2/commands/adjust-inventory.handler';
import { GetCatalogProductV2Handler } from '@/application/catalog-v2/queries/get-catalog-product-v2.handler';
import { GetCatalogProductsV2Handler } from '@/application/catalog-v2/queries/get-catalog-products-v2.handler';
import { ApplicationError } from '@/application/shared/errors/application.error';

describe('Catalog v2 application operations', () => {
  const product = {
    id: '018f7c1e-89ab-7cde-8f01-234567890123',
    name: 'Áo thun',
    slug: 'ao-thun',
    description: null,
    categoryId: null,
    status: 'DRAFT' as const,
    publishedAt: null,
    media: [],
    options: [],
    variants: [],
    summary: {
      priceMin: 100_000,
      priceMax: 100_000,
      availableQuantity: 3,
      sellableVariantCount: 1,
      primaryMediaUrl: null,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('delegates catalog writes and inventory adjustments through the repository port', async () => {
    const repository = {
      create: jest.fn().mockResolvedValue(product),
      update: jest.fn().mockResolvedValue(product),
      adjustInventory: jest.fn().mockResolvedValue({
        warehouseCode: 'DEFAULT',
        variantId: 'variant-1',
        onHand: 7,
        reserved: 2,
        availableQuantity: 5,
      }),
    };
    const input = {
      name: 'Áo thun',
      variants: [{ sku: 'TSHIRT-ONE', price: 100_000 }],
    };
    await expect(
      new CreateCatalogProductV2Handler(repository as never).execute({ input }),
    ).resolves.toBe(product);
    await expect(
      new UpdateCatalogProductV2Handler(repository as never).execute({
        id: product.id,
        input: { status: 'ACTIVE' },
      }),
    ).resolves.toBe(product);
    await expect(
      new AdjustInventoryHandler(repository as never).execute({
        input: {
          variantId: 'variant-1',
          quantityDelta: 2,
          reason: 'Restock',
        },
      }),
    ).resolves.toMatchObject({ availableQuantity: 5 });
    expect(repository.create).toHaveBeenCalledWith(input);
    expect(repository.update).toHaveBeenCalledWith(product.id, {
      status: 'ACTIVE',
    });
    expect(repository.adjustInventory).toHaveBeenCalledWith({
      variantId: 'variant-1',
      quantityDelta: 2,
      reason: 'Restock',
    });
  });

  it('uses public/admin reads correctly and returns a stable not-found error', async () => {
    const repository = {
      findPublicById: jest.fn().mockResolvedValue(product),
      findAdminById: jest.fn().mockResolvedValue(null),
      findPublicPage: jest
        .fn()
        .mockResolvedValue({ data: [product], nextCursor: null }),
    };
    const detail = new GetCatalogProductV2Handler(repository as never);
    await expect(
      detail.execute({ id: product.id, admin: false }),
    ).resolves.toBe(product);
    await expect(
      detail.execute({ id: 'missing', admin: true }),
    ).rejects.toMatchObject({
      code: 'PRODUCT_NOT_FOUND',
      kind: 'NOT_FOUND',
    } satisfies Partial<ApplicationError>);
    await expect(
      new GetCatalogProductsV2Handler(repository as never).execute({
        filters: { search: 'áo', inStock: true },
        cursor: null,
        limit: 20,
      }),
    ).resolves.toEqual({ data: [product], nextCursor: null });
    expect(repository.findPublicById).toHaveBeenCalledWith(product.id);
    expect(repository.findAdminById).toHaveBeenCalledWith('missing');
    expect(repository.findPublicPage).toHaveBeenCalledWith({
      filters: { search: 'áo', inStock: true },
      cursor: null,
      limit: 20,
    });
  });
});
