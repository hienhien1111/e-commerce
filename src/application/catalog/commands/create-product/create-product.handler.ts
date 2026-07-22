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

    const sku = command.payload.sku?.trim().toUpperCase() || null;
    if (sku && (await this.productRepository.findBySku(sku))) {
      throw new ConflictException('Product SKU already exists');
    }
    const categoryId = command.payload.categoryId ?? null;
    if (categoryId && !(await this.categoryRepository.findById(categoryId))) {
      throw new NotFoundException('Category not found');
    }

    const productId = generateUuidV7();
    const product = await this.productRepository.create(
      ProductFactory.create({
        id: productId,
        name: command.payload.name.trim(),
        slug,
        description: command.payload.description?.trim() || null,
        price: command.payload.price,
        comparePrice: command.payload.comparePrice ?? null,
        stock: command.payload.stock ?? 0,
        sku: null,
        categoryId,
        isActive: command.payload.isActive ?? true,
        images: [],
        variants: [
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
        ],
      }),
    );
    await this.eventBus.publish(new ProductCreatedEvent(product));
    return product;
  }
}
