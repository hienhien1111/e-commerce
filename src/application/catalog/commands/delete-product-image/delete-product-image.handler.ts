import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ProductRepositoryPort } from '@/application/catalog/ports/product.repository.port';
import { PRODUCT_REPOSITORY_PORT } from '@/application/catalog/ports/product.repository.port.token';
import type { FileStoragePort } from '@/application/shared/ports/file-storage/file-storage.port';
import { FILE_STORAGE_PORT } from '@/application/shared/ports/file-storage/file-storage.port.token';
import { DeleteProductImageCommand } from './delete-product-image.command';

@CommandHandler(DeleteProductImageCommand)
export class DeleteProductImageHandler
  implements ICommandHandler<DeleteProductImageCommand>
{
  private readonly logger = new Logger(DeleteProductImageHandler.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly productRepository: ProductRepositoryPort,
    @Inject(FILE_STORAGE_PORT)
    private readonly fileStorage: FileStoragePort,
  ) {}

  async execute(command: DeleteProductImageCommand): Promise<void> {
    const product = await this.productRepository.findById(command.productId);
    if (!product) throw new NotFoundException('Product not found');
    const image = product.removeImage(command.imageId);
    if (!image) throw new NotFoundException('Product image not found');
    await this.productRepository.save(product);
    try {
      await this.fileStorage.delete(image.publicId);
    } catch {
      this.logger.warn(
        `Could not delete product image asset: ${image.publicId}`,
      );
    }
  }
}
