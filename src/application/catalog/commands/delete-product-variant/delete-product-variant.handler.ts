import {
  Inject,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ProductRepositoryPort } from '@/application/catalog/ports/product.repository.port';
import { PRODUCT_REPOSITORY_PORT } from '@/application/catalog/ports/product.repository.port.token';
import { DeleteProductVariantCommand } from './delete-product-variant.command';

@CommandHandler(DeleteProductVariantCommand)
export class DeleteProductVariantHandler
  implements ICommandHandler<DeleteProductVariantCommand>
{
  constructor(
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly products: ProductRepositoryPort,
  ) {}

  async execute(command: DeleteProductVariantCommand): Promise<void> {
    const product = await this.products.findById(command.productId);
    if (!product) throw new NotFoundException('Product not found');
    let variant;
    try {
      variant = product.removeVariant(command.variantId);
    } catch (error) {
      throw new UnprocessableEntityException(
        error instanceof Error
          ? error.message
          : 'Cannot delete product variant',
      );
    }
    if (!variant) throw new NotFoundException('Product variant not found');
    await this.products.softDeleteVariant(variant);
  }
}
