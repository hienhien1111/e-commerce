import {
  ConflictException,
  Inject,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ProductRepositoryPort } from '@/application/catalog/ports/product.repository.port';
import { PRODUCT_REPOSITORY_PORT } from '@/application/catalog/ports/product.repository.port.token';
import { ApplicationError } from '@/application/shared/errors/application.error';
import { UpdateProductVariantCommand } from './update-product-variant.command';

@CommandHandler(UpdateProductVariantCommand)
export class UpdateProductVariantHandler
  implements ICommandHandler<UpdateProductVariantCommand>
{
  constructor(
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly products: ProductRepositoryPort,
  ) {}

  async execute(command: UpdateProductVariantCommand) {
    const product = await this.products.findById(command.productId);
    if (!product) throw new NotFoundException('Product not found');
    const variant = product.findVariant(command.variantId);
    if (!variant || variant.deletedAt) {
      throw new NotFoundException('Product variant not found');
    }

    const label =
      command.payload.label === undefined
        ? undefined
        : command.payload.label?.trim() || null;
    if (
      label === null &&
      product.variants.filter((candidate) => !candidate.deletedAt).length > 1
    ) {
      throw new UnprocessableEntityException(
        'Only a simple product may have a hidden default variant',
      );
    }
    if (
      label &&
      product.variants.some(
        (candidate) =>
          candidate.id !== variant.id &&
          !candidate.deletedAt &&
          candidate.label?.toLocaleLowerCase() === label.toLocaleLowerCase(),
      )
    ) {
      throw new ConflictException('Product variant label already exists');
    }

    const sku =
      command.payload.sku === undefined
        ? undefined
        : command.payload.sku.trim().toUpperCase();
    if (sku === '') {
      throw new UnprocessableEntityException('Variant SKU is required');
    }
    if (sku && sku !== variant.sku) {
      throw new ApplicationError(
        'SKU_IMMUTABLE',
        'Variant SKU is immutable after creation',
        'UNPROCESSABLE',
      );
    }
    const image =
      command.payload.imageId === undefined
        ? undefined
        : command.payload.imageId
          ? product.images.find(
              (candidate) => candidate.id === command.payload.imageId,
            )
          : null;
    if (command.payload.imageId && !image) {
      throw new UnprocessableEntityException(
        'Variant image must belong to product',
      );
    }

    try {
      variant.update({
        ...(label !== undefined ? { label } : {}),
        ...(sku !== undefined ? { sku } : {}),
        ...(command.payload.price !== undefined
          ? { price: command.payload.price }
          : {}),
        ...(command.payload.comparePrice !== undefined
          ? { comparePrice: command.payload.comparePrice }
          : {}),
        ...(command.payload.stock !== undefined
          ? { stock: command.payload.stock }
          : {}),
        ...(command.payload.isActive !== undefined
          ? { isActive: command.payload.isActive }
          : {}),
        ...(image !== undefined
          ? { imageId: image?.id ?? null, imageUrl: image?.url ?? null }
          : {}),
      });
    } catch (error) {
      throw new UnprocessableEntityException(
        error instanceof Error ? error.message : 'Invalid product variant',
      );
    }
    return this.products.saveVariant(variant);
  }
}
