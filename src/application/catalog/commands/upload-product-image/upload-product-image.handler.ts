import {
  BadRequestException,
  ConflictException,
  Inject,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ProductRepositoryPort } from '@/application/catalog/ports/product.repository.port';
import { PRODUCT_REPOSITORY_PORT } from '@/application/catalog/ports/product.repository.port.token';
import type {
  FileStoragePort,
  StoredFile,
} from '@/application/shared/ports/file-storage/file-storage.port';
import { FileStorageInvalidFileError } from '@/application/shared/ports/file-storage/file-storage.port';
import { FILE_STORAGE_PORT } from '@/application/shared/ports/file-storage/file-storage.port.token';
import { ProductImageFactory } from '@/domain/factories/product-image.factory';
import { UploadProductImageCommand } from './upload-product-image.command';

@CommandHandler(UploadProductImageCommand)
export class UploadProductImageHandler
  implements ICommandHandler<UploadProductImageCommand>
{
  private readonly logger = new Logger(UploadProductImageHandler.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly productRepository: ProductRepositoryPort,
    @Inject(FILE_STORAGE_PORT)
    private readonly fileStorage: FileStoragePort,
  ) {}

  async execute(command: UploadProductImageCommand) {
    const product = await this.productRepository.findById(command.productId);
    if (!product) throw new NotFoundException('Product not found');
    if (product.images.length >= 5) {
      throw new ConflictException('A product can have at most 5 images');
    }

    let stored: StoredFile;
    try {
      stored = await this.fileStorage.upload(
        command.buffer,
        `products/${product.id}`,
      );
    } catch (error) {
      if (error instanceof FileStorageInvalidFileError) {
        throw new BadRequestException(
          'The selected image is corrupt or uses an unsupported encoding',
        );
      }
      throw new ServiceUnavailableException(
        'Product image storage is unavailable',
      );
    }

    const image = ProductImageFactory.create({
      url: stored.url,
      publicId: stored.publicId,
      isPrimary: product.images.length === 0,
      sortOrder: product.nextImageSortOrder(),
    });
    product.addImage(image);
    try {
      const saved = await this.productRepository.save(product);
      return saved.images.find((item) => item.id === image.id) ?? image;
    } catch (error) {
      await this.deleteBestEffort(
        stored.publicId,
        'new product image after update failure',
      );
      throw error;
    }
  }

  private async deleteBestEffort(
    publicId: string,
    description: string,
  ): Promise<void> {
    try {
      await this.fileStorage.delete(publicId);
    } catch {
      this.logger.warn(`Could not delete ${description}: ${publicId}`);
    }
  }
}
