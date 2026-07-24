import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateProductVariantHandler } from '@/application/catalog/commands/create-product-variant/create-product-variant.handler';
import { UpdateProductVariantHandler } from '@/application/catalog/commands/update-product-variant/update-product-variant.handler';
import { DeleteProductVariantHandler } from '@/application/catalog/commands/delete-product-variant/delete-product-variant.handler';
import { ProductFactory } from '@/domain/factories/product.factory';
import { ProductImageFactory } from '@/domain/factories/product-image.factory';
import { ProductVariantFactory } from '@/domain/factories/product-variant.factory';

const variant = (overrides: Record<string, unknown> = {}) =>
  ProductVariantFactory.create({
    id: 'variant-default',
    productId: 'product-1',
    label: null,
    sku: 'TSHIRT-DEFAULT',
    price: 100_000,
    comparePrice: null,
    stock: 4,
    isActive: true,
    imageId: null,
    imageUrl: null,
    ...overrides,
  });

const product = (overrides: Record<string, unknown> = {}) => {
  const image = ProductImageFactory.create({
    id: 'image-1',
    url: 'https://cdn.test/product.jpg',
    publicId: 'products/product-1/image-1',
    isPrimary: true,
    sortOrder: 0,
  });
  return ProductFactory.create({
    id: 'product-1',
    name: 'Áo thun',
    slug: 'ao-thun',
    description: null,
    price: 100_000,
    comparePrice: null,
    stock: 4,
    sku: null,
    categoryId: null,
    isActive: true,
    images: [image],
    variants: [variant()],
    ...overrides,
  });
};

describe('Product variant application operations', () => {
  it('requires the hidden default variant to be labelled before adding variants', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue(product()),
      findBySku: jest.fn().mockResolvedValue(null),
      createVariant: jest.fn(),
    };
    const handler = new CreateProductVariantHandler(repository as never);

    await expect(
      handler.execute({
        productId: 'product-1',
        payload: {
          label: 'Đen - L',
          sku: 'TSHIRT-BLACK-L',
          price: 120_000,
          stock: 2,
        },
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('creates a labelled variant with normalized SKU and its own product image', async () => {
    const defaultVariant = variant();
    defaultVariant.update({ label: 'Đen - M' });
    const target = product({ variants: [defaultVariant] });
    const repository = {
      findById: jest.fn().mockResolvedValue(target),
      findBySku: jest.fn().mockResolvedValue(null),
      createVariant: jest.fn().mockImplementation(async (value) => value),
    };

    const saved = await new CreateProductVariantHandler(
      repository as never,
    ).execute({
      productId: target.id,
      payload: {
        label: '  Trắng - L ',
        sku: ' tshirt-white-l ',
        price: 120_000,
        comparePrice: 150_000,
        stock: 2,
        imageId: 'image-1',
      },
    });

    expect(saved).toMatchObject({
      label: 'Trắng - L',
      sku: 'TSHIRT-WHITE-L',
      imageId: 'image-1',
      imageUrl: 'https://cdn.test/product.jpg',
    });
    expect(repository.createVariant).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicate labels, SKUs, and an image from another product', async () => {
    const defaultVariant = variant();
    defaultVariant.update({ label: 'Đen - M' });
    const target = product({ variants: [defaultVariant] });
    const repository = {
      findById: jest.fn().mockResolvedValue(target),
      findBySku: jest.fn().mockResolvedValue(null),
      createVariant: jest.fn(),
    };
    const handler = new CreateProductVariantHandler(repository as never);

    await expect(
      handler.execute({
        productId: target.id,
        payload: {
          label: 'đen - m',
          sku: 'TSHIRT-BLACK-L',
          price: 120_000,
          stock: 2,
        },
      }),
    ).rejects.toThrow(ConflictException);

    repository.findBySku.mockResolvedValueOnce(product({ id: 'other' }));
    await expect(
      handler.execute({
        productId: target.id,
        payload: {
          label: 'Trắng - L',
          sku: 'taken-sku',
          price: 120_000,
          stock: 2,
        },
      }),
    ).rejects.toThrow(ConflictException);

    await expect(
      handler.execute({
        productId: target.id,
        payload: {
          label: 'Trắng - L',
          sku: 'TSHIRT-WHITE-L',
          price: 120_000,
          stock: 2,
          imageId: 'foreign-image',
        },
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('updates a variant and cannot soft-delete the final variant', async () => {
    const target = product();
    const repository = {
      findById: jest.fn().mockResolvedValue(target),
      findBySku: jest.fn().mockResolvedValue(null),
      saveVariant: jest.fn().mockImplementation(async (value) => value),
      softDeleteVariant: jest.fn(),
    };

    const updated = await new UpdateProductVariantHandler(
      repository as never,
    ).execute({
      productId: target.id,
      variantId: 'variant-default',
      payload: { label: 'Đen - M', stock: 5 },
    });
    expect(updated).toMatchObject({
      label: 'Đen - M',
      sku: 'TSHIRT-DEFAULT',
      stock: 5,
    });

    await expect(
      new DeleteProductVariantHandler(repository as never).execute({
        productId: target.id,
        variantId: 'variant-default',
      }),
    ).rejects.toThrow('Product requires at least one variant');
  });

  it('keeps a created SKU immutable', async () => {
    const target = product();
    const repository = {
      findById: jest.fn().mockResolvedValue(target),
      findBySku: jest.fn(),
      saveVariant: jest.fn(),
      softDeleteVariant: jest.fn(),
    };

    await expect(
      new UpdateProductVariantHandler(repository as never).execute({
        productId: target.id,
        variantId: 'variant-default',
        payload: { sku: 'TSHIRT-REASSIGNED' },
      }),
    ).rejects.toMatchObject({ code: 'SKU_IMMUTABLE' });
    expect(repository.findBySku).not.toHaveBeenCalled();
  });
});
