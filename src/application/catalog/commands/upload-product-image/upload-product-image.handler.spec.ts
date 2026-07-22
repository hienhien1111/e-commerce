import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UploadProductImageHandler } from './upload-product-image.handler';
import { UploadProductImageCommand } from './upload-product-image.command';
import { PRODUCT_REPOSITORY_PORT } from '@/application/catalog/ports/product.repository.port.token';
import { FILE_STORAGE_PORT } from '@/application/shared/ports/file-storage/file-storage.port.token';
import { FileStorageInvalidFileError } from '@/application/shared/ports/file-storage/file-storage.port';
import { ProductFactory } from '@/domain/factories/product.factory';

describe('UploadProductImageHandler', () => {
  let productRepository: Record<string, jest.Mock>;
  let fileStorage: Record<string, jest.Mock>;
  let handler: UploadProductImageHandler;

  beforeEach(async () => {
    productRepository = { findById: jest.fn(), save: jest.fn() };
    fileStorage = { upload: jest.fn(), delete: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        UploadProductImageHandler,
        { provide: PRODUCT_REPOSITORY_PORT, useValue: productRepository },
        { provide: FILE_STORAGE_PORT, useValue: fileStorage },
      ],
    }).compile();
    handler = module.get(UploadProductImageHandler);
  });

  it('persists an uploaded primary image', async () => {
    const product = ProductFactory.create({
      name: 'P',
      slug: 'p',
      description: null,
      price: 1,
      comparePrice: null,
      stock: 0,
      sku: null,
      categoryId: null,
      isActive: true,
      images: [],
    });
    productRepository.findById.mockResolvedValue(product);
    productRepository.save.mockImplementation(async (saved) => saved);
    fileStorage.upload.mockResolvedValue({
      url: 'https://storage.test/image.png',
      publicId: 'products/p/image',
    });

    const image = await handler.execute(
      new UploadProductImageCommand(product.id, Buffer.from('image')),
    );
    expect(image.isPrimary).toBe(true);
    expect(fileStorage.upload).toHaveBeenCalledWith(
      expect.any(Buffer),
      `products/${product.id}`,
    );
  });

  it('rejects a sixth image and maps storage failures', async () => {
    const product = ProductFactory.create({
      name: 'P',
      slug: 'p',
      description: null,
      price: 1,
      comparePrice: null,
      stock: 0,
      sku: null,
      categoryId: null,
      isActive: true,
      images: Array.from({ length: 5 }, (_, index) => ({
        id: String(index),
      })) as never,
    });
    productRepository.findById.mockResolvedValue(product);
    await expect(
      handler.execute(
        new UploadProductImageCommand(product.id, Buffer.from('x')),
      ),
    ).rejects.toThrow(ConflictException);

    productRepository.findById.mockResolvedValue(
      ProductFactory.create({
        name: 'P',
        slug: 'p2',
        description: null,
        price: 1,
        comparePrice: null,
        stock: 0,
        sku: null,
        categoryId: null,
        isActive: true,
        images: [],
      }),
    );
    fileStorage.upload.mockRejectedValue(new Error('offline'));
    await expect(
      handler.execute(new UploadProductImageCommand('p', Buffer.from('x'))),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('reports an invalid image instead of a storage outage', async () => {
    productRepository.findById.mockResolvedValue(
      ProductFactory.create({
        name: 'P',
        slug: 'p3',
        description: null,
        price: 1,
        comparePrice: null,
        stock: 0,
        sku: null,
        categoryId: null,
        isActive: true,
        images: [],
      }),
    );
    fileStorage.upload.mockRejectedValue(new FileStorageInvalidFileError());

    await expect(
      handler.execute(new UploadProductImageCommand('p', Buffer.from('x'))),
    ).rejects.toThrow(BadRequestException);
  });
});
