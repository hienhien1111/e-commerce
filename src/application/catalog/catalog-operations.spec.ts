import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryHandler } from '@/application/catalog/commands/create-category/create-category.handler';
import { DeleteCategoryHandler } from '@/application/catalog/commands/delete-category/delete-category.handler';
import { DeleteProductImageHandler } from '@/application/catalog/commands/delete-product-image/delete-product-image.handler';
import { DeleteProductHandler } from '@/application/catalog/commands/delete-product/delete-product.handler';
import { UpdateCategoryHandler } from '@/application/catalog/commands/update-category/update-category.handler';
import { UpdateProductHandler } from '@/application/catalog/commands/update-product/update-product.handler';
import { GetAdminCategoriesHandler } from '@/application/catalog/queries/get-admin-categories/get-admin-categories.handler';
import { GetAdminProductsHandler } from '@/application/catalog/queries/get-admin-products/get-admin-products.handler';
import { GetCategoriesHandler } from '@/application/catalog/queries/get-categories/get-categories.handler';
import { GetCategoryHandler } from '@/application/catalog/queries/get-category/get-category.handler';
import { GetProductHandler } from '@/application/catalog/queries/get-product/get-product.handler';
import { GetProductsHandler } from '@/application/catalog/queries/get-products/get-products.handler';
import { CategoryHierarchyService } from '@/application/catalog/services/category-hierarchy.service';
import { CategoryFactory } from '@/domain/factories/category.factory';
import { ProductImageFactory } from '@/domain/factories/product-image.factory';
import { ProductFactory } from '@/domain/factories/product.factory';

const category = (overrides: Partial<Record<string, unknown>> = {}) =>
  CategoryFactory.create({
    id: 'category-1',
    name: 'Category',
    slug: 'category',
    description: null,
    parentId: null,
    sortOrder: 0,
    isActive: true,
    ...overrides,
  } as never);

const product = (overrides: Partial<Record<string, unknown>> = {}) =>
  ProductFactory.create({
    id: 'product-1',
    name: 'Product',
    slug: 'product',
    description: null,
    price: 100_000,
    comparePrice: null,
    stock: 3,
    sku: 'SKU-1',
    categoryId: null,
    isActive: true,
    images: [],
    ...overrides,
  } as never);

describe('Catalog application operations', () => {
  it('accepts only a root category as a parent', async () => {
    const repository = { findById: jest.fn() };
    const hierarchy = new CategoryHierarchyService(repository as never);

    await expect(hierarchy.assertValidParent(null)).resolves.toBeUndefined();
    await expect(
      hierarchy.assertValidParent('category-1', 'category-1'),
    ).rejects.toThrow(BadRequestException);
    repository.findById.mockResolvedValueOnce(null);
    await expect(hierarchy.assertValidParent('missing')).rejects.toThrow(
      NotFoundException,
    );
    repository.findById.mockResolvedValueOnce(category({ parentId: 'root' }));
    await expect(hierarchy.assertValidParent('child')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('creates a normalized category and rejects duplicate slugs', async () => {
    const repository = {
      findBySlug: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async (value) => value),
    };
    const hierarchy = { assertValidParent: jest.fn() };
    const handler = new CreateCategoryHandler(
      repository as never,
      hierarchy as never,
    );

    const created = await handler.execute({
      payload: { name: '  Điện thoại  ', description: '  Mới  ' },
    });
    expect(created).toMatchObject({
      name: 'Điện thoại',
      slug: 'dien-thoai',
      description: 'Mới',
    });
    repository.findBySlug.mockResolvedValueOnce(category());
    await expect(
      handler.execute({ payload: { name: 'Category' } }),
    ).rejects.toThrow(ConflictException);
  });

  it('soft-deletes only a category without child or product dependencies', async () => {
    const target = category();
    const categories = {
      findById: jest.fn().mockResolvedValue(target),
      hasChildren: jest.fn().mockResolvedValue(false),
      save: jest.fn(),
    };
    const products = { existsByCategoryId: jest.fn().mockResolvedValue(false) };
    const handler = new DeleteCategoryHandler(
      categories as never,
      products as never,
    );

    await handler.execute({ id: target.id });
    expect(target.deletedAt).toBeInstanceOf(Date);
    expect(categories.save).toHaveBeenCalledWith(target);
    categories.hasChildren.mockResolvedValueOnce(true);
    await expect(handler.execute({ id: target.id })).rejects.toThrow(
      ConflictException,
    );
  });

  it('updates a category name and validates a newly selected parent', async () => {
    const target = category();
    const repository = {
      findById: jest.fn().mockResolvedValue(target),
      findBySlug: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const hierarchy = { assertValidParent: jest.fn() };
    const result = await new UpdateCategoryHandler(
      repository as never,
      hierarchy as never,
    ).execute({
      id: target.id,
      payload: { name: ' New name ', parentId: null },
    });

    expect(result).toMatchObject({ name: 'New name', slug: 'new-name' });
    expect(hierarchy.assertValidParent).toHaveBeenCalledWith(null, target.id);
  });

  it('soft-deletes a product and removes its image while keeping storage cleanup best effort', async () => {
    const image = ProductImageFactory.create({
      id: 'image-1',
      url: 'https://storage.test/image.jpg',
      publicId: 'products/product-1/image-1',
      isPrimary: true,
      sortOrder: 0,
    });
    const target = product({ images: [image] });
    const repository = {
      findById: jest.fn().mockResolvedValue(target),
      save: jest.fn(),
    };

    await new DeleteProductHandler(repository as never).execute({
      id: target.id,
    });
    expect(target.deletedAt).toBeInstanceOf(Date);

    const storage = {
      delete: jest.fn().mockRejectedValue(new Error('offline')),
    };
    await expect(
      new DeleteProductImageHandler(
        repository as never,
        storage as never,
      ).execute({
        productId: target.id,
        imageId: image.id,
      }),
    ).resolves.toBeUndefined();
    expect(repository.save).toHaveBeenCalledWith(target);
  });

  it('updates product fields and rejects duplicate SKU or a missing category', async () => {
    const target = product();
    const products = {
      findById: jest.fn().mockResolvedValue(target),
      findBySlug: jest.fn().mockResolvedValue(null),
      findBySku: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation(async (value) => value),
      saveVariant: jest.fn().mockImplementation(async (value) => value),
    };
    const categories = { findById: jest.fn().mockResolvedValue(category()) };
    const handler = new UpdateProductHandler(
      products as never,
      categories as never,
    );

    await expect(
      handler.execute({
        id: target.id,
        payload: {
          name: ' New product ',
          sku: ' NEW-SKU ',
          categoryId: 'category-1',
        },
      }),
    ).resolves.toMatchObject({
      name: 'New product',
      slug: 'new-product',
      sku: 'NEW-SKU',
    });
    products.findBySku.mockResolvedValueOnce(product({ id: 'other' }));
    await expect(
      handler.execute({ id: target.id, payload: { sku: 'OTHER' } }),
    ).rejects.toThrow(ConflictException);
    categories.findById.mockResolvedValueOnce(null);
    await expect(
      handler.execute({ id: target.id, payload: { categoryId: 'missing' } }),
    ).rejects.toThrow(NotFoundException);
  });

  it('delegates list and admin queries to their repositories', async () => {
    const categories = {
      findAdmin: jest.fn().mockResolvedValue(['admin-category']),
      findPublic: jest.fn().mockResolvedValue(['public-category']),
      findPublicById: jest.fn().mockResolvedValue(category()),
    };
    const products = {
      findAdminPage: jest.fn().mockResolvedValue({ data: ['admin-product'] }),
      findPublicPage: jest.fn().mockResolvedValue({ data: ['public-product'] }),
      findPublicById: jest.fn().mockResolvedValue(product()),
    };

    await expect(
      new GetAdminCategoriesHandler(categories as never).execute({
        filters: { isActive: true },
      }),
    ).resolves.toEqual(['admin-category']);
    await expect(
      new GetCategoriesHandler(categories as never).execute({ parentId: null }),
    ).resolves.toEqual(['public-category']);
    await expect(
      new GetCategoryHandler(categories as never).execute({ id: 'category-1' }),
    ).resolves.toMatchObject({ id: 'category-1' });
    await expect(
      new GetAdminProductsHandler(products as never).execute({
        cursor: null,
        limit: 10,
      }),
    ).resolves.toEqual({ data: ['admin-product'] });
    await expect(
      new GetProductsHandler(products as never).execute({
        filters: {},
        cursor: null,
        limit: 10,
      }),
    ).resolves.toEqual({ data: ['public-product'] });
    await expect(
      new GetProductHandler(products as never).execute({ id: 'product-1' }),
    ).resolves.toMatchObject({ id: 'product-1' });

    categories.findPublicById.mockResolvedValueOnce(null);
    products.findPublicById.mockResolvedValueOnce(null);
    await expect(
      new GetCategoryHandler(categories as never).execute({ id: 'missing' }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      new GetProductHandler(products as never).execute({ id: 'missing' }),
    ).rejects.toThrow(NotFoundException);
  });
});
