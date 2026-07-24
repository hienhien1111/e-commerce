import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { CreateProductHandler } from './create-product.handler';
import { CreateProductCommand } from './create-product.command';
import { PRODUCT_REPOSITORY_PORT } from '@/application/catalog/ports/product.repository.port.token';
import { CATEGORY_REPOSITORY_PORT } from '@/application/catalog/ports/category.repository.port.token';
import { Product } from '@/domain/entities/product';

describe('CreateProductHandler', () => {
  const command = new CreateProductCommand({
    name: 'Tai nghe Bluetooth',
    price: 200000,
  });
  let productRepository: Record<string, jest.Mock>;
  let categoryRepository: Record<string, jest.Mock>;
  let eventBus: { publish: jest.Mock };
  let handler: CreateProductHandler;

  beforeEach(async () => {
    productRepository = {
      findBySlug: jest.fn(),
      findBySku: jest.fn(),
      create: jest.fn(),
    };
    categoryRepository = { findById: jest.fn() };
    eventBus = { publish: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        CreateProductHandler,
        { provide: PRODUCT_REPOSITORY_PORT, useValue: productRepository },
        { provide: CATEGORY_REPOSITORY_PORT, useValue: categoryRepository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();
    handler = module.get(CreateProductHandler);
  });

  it('creates a product with an auto-generated slug and publishes an event', async () => {
    productRepository.create.mockImplementation(
      async (product: Product) => product,
    );
    const result = await handler.execute(command);

    expect(result.slug).toBe('tai-nghe-bluetooth');
    expect(productRepository.create).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicate slugs and missing categories', async () => {
    productRepository.findBySlug.mockResolvedValue({ id: 'other' });
    await expect(handler.execute(command)).rejects.toThrow(ConflictException);

    productRepository.findBySlug.mockResolvedValue(null);
    categoryRepository.findById.mockResolvedValue(null);
    await expect(
      handler.execute(
        new CreateProductCommand({
          name: 'Loa',
          price: 1,
          categoryId: 'missing',
        }),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('creates all labelled variants in one product aggregate', async () => {
    productRepository.create.mockImplementation(
      async (product: Product) => product,
    );
    const result = await handler.execute(
      new CreateProductCommand({
        name: 'Áo thun',
        price: 100000,
        variants: [
          { label: 'Đen - M', sku: 'TEE-BLACK-M', price: 100000, stock: 3 },
          { label: 'Trắng - L', sku: 'TEE-WHITE-L', price: 120000, stock: 5 },
        ],
      }),
    );

    expect(result.variants).toHaveLength(2);
    expect(result.variants.map((variant) => variant.label)).toEqual([
      'Đen - M',
      'Trắng - L',
    ]);
    expect(result.stock).toBe(8);
    expect(result.price).toBe(100000);
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ product: result }),
    );
  });

  it('rejects an incomplete or duplicate batch before persisting', async () => {
    await expect(
      handler.execute(
        new CreateProductCommand({
          name: 'Áo thiếu nhãn',
          price: 1,
          variants: [{ sku: 'TEE-DEFAULT', price: 1, stock: 1 }],
        }),
      ),
    ).rejects.toThrow(UnprocessableEntityException);

    await expect(
      handler.execute(
        new CreateProductCommand({
          name: 'Áo trùng SKU',
          price: 1,
          variants: [
            { label: 'M', sku: 'TEE-M', price: 1, stock: 1 },
            { label: 'L', sku: 'tee-m', price: 1, stock: 1 },
          ],
        }),
      ),
    ).rejects.toThrow(ConflictException);
    expect(productRepository.create).not.toHaveBeenCalled();
  });
});
