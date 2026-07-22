import {
  ConflictException,
  Inject,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ProductRepositoryPort } from '@/application/catalog/ports/product.repository.port';
import { PRODUCT_REPOSITORY_PORT } from '@/application/catalog/ports/product.repository.port.token';
import { ProductVariantFactory } from '@/domain/factories/product-variant.factory';
import { CreateProductVariantCommand } from './create-product-variant.command';

const normalizedLabel = (label: string | null | undefined) =>
  label?.trim() || null;

@CommandHandler(CreateProductVariantCommand)
export class CreateProductVariantHandler
  implements ICommandHandler<CreateProductVariantCommand>
{
  constructor(
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly products: ProductRepositoryPort,
  ) {}

  async execute(command: CreateProductVariantCommand) {
    const product = await this.products.findById(command.productId);
    if (!product) throw new NotFoundException('Product not found');
    if (product.variants.length >= 100) {
      throw new UnprocessableEntityException(
        'A product can have at most 100 variants',
      );
    }
    if (product.variants.some((variant) => variant.label === null)) {
      throw new UnprocessableEntityException(
        'Label the default variant before adding another variant',
      );
    }

    const label = normalizedLabel(command.payload.label);
    if (!label) {
      throw new UnprocessableEntityException(
        'Additional product variants require a label',
      );
    }
    if (
      product.variants.some(
        (variant) =>
          variant.label?.toLocaleLowerCase() === label.toLocaleLowerCase(),
      )
    ) {
      throw new ConflictException('Product variant label already exists');
    }

    const sku = command.payload.sku.trim().toUpperCase();
    if (!sku) throw new UnprocessableEntityException('Variant SKU is required');
    if (await this.products.findBySku(sku)) {
      throw new ConflictException('Product variant SKU already exists');
    }
    const image = command.payload.imageId
      ? product.images.find(
          (candidate) => candidate.id === command.payload.imageId,
        )
      : null;
    if (command.payload.imageId && !image) {
      throw new UnprocessableEntityException(
        'Variant image must belong to product',
      );
    }

    let variant;
    try {
      variant = ProductVariantFactory.create({
        productId: product.id,
        label,
        sku,
        price: command.payload.price,
        comparePrice: command.payload.comparePrice ?? null,
        stock: command.payload.stock,
        isActive: command.payload.isActive ?? true,
        imageId: image?.id ?? null,
        imageUrl: image?.url ?? null,
      });
      product.addVariant(variant);
    } catch (error) {
      throw new UnprocessableEntityException(
        error instanceof Error ? error.message : 'Invalid product variant',
      );
    }
    return this.products.createVariant(variant);
  }
}
