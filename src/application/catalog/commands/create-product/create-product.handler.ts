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
import { ProductCreatedEvent } from '@/domain/events/product-created.event';
import { slugify } from '@/utils/slugify';
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

    const sku = command.payload.sku?.trim() || null;
    if (sku && (await this.productRepository.findBySku(sku))) {
      throw new ConflictException('Product SKU already exists');
    }
    const categoryId = command.payload.categoryId ?? null;
    if (categoryId && !(await this.categoryRepository.findById(categoryId))) {
      throw new NotFoundException('Category not found');
    }

    const product = await this.productRepository.create(
      ProductFactory.create({
        name: command.payload.name.trim(),
        slug,
        description: command.payload.description?.trim() || null,
        price: command.payload.price,
        comparePrice: command.payload.comparePrice ?? null,
        stock: command.payload.stock ?? 0,
        sku,
        categoryId,
        isActive: command.payload.isActive ?? true,
        images: [],
      }),
    );
    await this.eventBus.publish(new ProductCreatedEvent(product));
    return product;
  }
}
