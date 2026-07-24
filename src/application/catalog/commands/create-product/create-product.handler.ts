import {
  ConflictException,
  Inject,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import type { CategoryRepositoryPort } from '@/application/catalog/ports/category.repository.port';
import { CATEGORY_REPOSITORY_PORT } from '@/application/catalog/ports/category.repository.port.token';
import type { ProductRepositoryPort } from '@/application/catalog/ports/product.repository.port';
import { PRODUCT_REPOSITORY_PORT } from '@/application/catalog/ports/product.repository.port.token';
import { ProductFactory } from '@/domain/factories/product.factory';
import { ProductVariantFactory } from '@/domain/factories/product-variant.factory';
import { ProductCreatedEvent } from '@/domain/events/product-created.event';
import { slugify } from '@/utils/slugify';
import { generateUuidV7 } from '@/utils/uuid-v7';
import { CreateProductCommand } from './create-product.command';

const normalizeLabel = (label: string | null | undefined) =>
  label?.trim() || null;

@CommandHandler(CreateProductCommand)
export class CreateProductHandler
  implements ICommandHandler<CreateProductCommand>
{
  constructor(
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly productRepository: ProductRepositoryPort,
    @Inject(CATEGORY_REPOSITORY_PORT)
    private readonly categoryRepository: CategoryRepositoryPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateProductCommand) {
    const slug = slugify(command.payload.name);
    if (!slug)
      throw new UnprocessableEntityException('Product name cannot form a slug');
    if (await this.productRepository.findBySlug(slug)) {
      throw new ConflictException('Product slug already exists');
    }

    const requestedVariants = command.payload.variants?.map((variant) => ({
      ...variant,
      label: normalizeLabel(variant.label),
      sku: variant.sku.trim().toUpperCase(),
      comparePrice: variant.comparePrice ?? null,
      isActive: variant.isActive ?? true,
      imageId: null,
    }));
    if (requestedVariants?.length) {
      const labels = new Set<string>();
      const skus = new Set<string>();
      for (const variant of requestedVariants) {
        if (!variant.label) {
          throw new UnprocessableEntityException(
            'Variants created with a product require a label',
          );
        }
        if (!variant.sku) {
          throw new UnprocessableEntityException('Variant SKU is required');
        }
        const labelKey = variant.label.toLocaleLowerCase();
        const skuKey = variant.sku.toLocaleLowerCase();
        if (labels.has(labelKey)) {
          throw new ConflictException('Product variant label already exists');
        }
        if (skus.has(skuKey)) {
          throw new ConflictException('Product variant SKU already exists');
        }
        labels.add(labelKey);
        skus.add(skuKey);
        if (await this.productRepository.findBySku(variant.sku)) {
          throw new ConflictException('Product variant SKU already exists');
        }
      }
    }
    const sku = command.payload.sku?.trim().toUpperCase() || null;
    if (
      !requestedVariants?.length &&
      sku &&
      (await this.productRepository.findBySku(sku))
    ) {
      throw new ConflictException('Product SKU already exists');
    }
    const categoryId = command.payload.categoryId ?? null;
    if (categoryId && !(await this.categoryRepository.findById(categoryId))) {
      throw new NotFoundException('Category not found');
    }

    const productId = generateUuidV7();
    const variants = requestedVariants?.length
      ? requestedVariants.map((variant) =>
          ProductVariantFactory.create({
            productId,
            label: variant.label,
            sku: variant.sku,
            price: variant.price,
            comparePrice: variant.comparePrice,
            stock: variant.stock,
            isActive: variant.isActive,
            imageId: null,
            imageUrl: null,
          }),
        )
      : [
          ProductVariantFactory.create({
            productId,
            label: null,
            sku: sku ?? `PRODUCT-${slug.toUpperCase()}`,
            price: command.payload.price,
            comparePrice: command.payload.comparePrice ?? null,
            stock: command.payload.stock ?? 0,
            isActive: command.payload.isActive ?? true,
            imageId: null,
            imageUrl: null,
          }),
        ];
    const initialVariant = variants[0];
    const draft = ProductFactory.create({
      id: productId,
      name: command.payload.name.trim(),
      slug,
      description: command.payload.description?.trim() || null,
      price: initialVariant.price,
      comparePrice: initialVariant.comparePrice,
      stock: initialVariant.stock,
      sku: null,
      categoryId,
      isActive: command.payload.isActive ?? true,
      images: [],
      variants,
    });
    // Legacy Product fields remain a read projection while v1 is retired.
    // Calculate them from every submitted variant before the single DB write.
    draft.syncProjection();
    const product = await this.productRepository.create(draft);
    await this.eventBus.publish(new ProductCreatedEvent(product));
    return product;
  }
}
