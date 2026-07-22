import {
  ConflictException,
  Inject,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { CategoryRepositoryPort } from '@/application/catalog/ports/category.repository.port';
import { CATEGORY_REPOSITORY_PORT } from '@/application/catalog/ports/category.repository.port.token';
import type { ProductRepositoryPort } from '@/application/catalog/ports/product.repository.port';
import { PRODUCT_REPOSITORY_PORT } from '@/application/catalog/ports/product.repository.port.token';
import { ProductProps } from '@/domain/entities/product';
import { slugify } from '@/utils/slugify';
import { UpdateProductCommand } from './update-product.command';

@CommandHandler(UpdateProductCommand)
export class UpdateProductHandler
  implements ICommandHandler<UpdateProductCommand>
{
  constructor(
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly productRepository: ProductRepositoryPort,
    @Inject(CATEGORY_REPOSITORY_PORT)
    private readonly categoryRepository: CategoryRepositoryPort,
  ) {}

  async execute(command: UpdateProductCommand) {
    const product = await this.productRepository.findById(command.id);
    if (!product) throw new NotFoundException('Product not found');

    const update: Partial<Omit<ProductProps, 'images' | 'variants'>> = {
      ...command.payload,
    };
    const changesDefaultVariant = [
      command.payload.price,
      command.payload.comparePrice,
      command.payload.stock,
      command.payload.sku,
    ].some((value) => value !== undefined);
    const defaultVariant = product.variants[0];
    if (
      changesDefaultVariant &&
      (product.variants.length !== 1 || defaultVariant?.label !== null)
    ) {
      throw new UnprocessableEntityException(
        'Edit price, SKU, and stock on individual variants for this product',
      );
    }
    if (command.payload.name !== undefined) {
      const slug = slugify(command.payload.name);
      if (!slug)
        throw new UnprocessableEntityException(
          'Product name cannot form a slug',
        );
      const existing = await this.productRepository.findBySlug(slug);
      if (existing && existing.id !== product.id) {
        throw new ConflictException('Product slug already exists');
      }
      update.name = command.payload.name.trim();
      update.slug = slug;
    }
    if (command.payload.sku !== undefined) {
      const sku = command.payload.sku?.trim().toUpperCase() || null;
      if (sku) {
        const existing = await this.productRepository.findBySku(sku);
        if (existing && existing.id !== product.id) {
          throw new ConflictException('Product SKU already exists');
        }
      }
    }
    if (command.payload.description !== undefined) {
      update.description = command.payload.description?.trim() || null;
    }
    if (
      command.payload.categoryId !== undefined &&
      command.payload.categoryId !== null
    ) {
      if (
        !(await this.categoryRepository.findById(command.payload.categoryId))
      ) {
        throw new NotFoundException('Category not found');
      }
    }

    if (changesDefaultVariant && defaultVariant) {
      defaultVariant.update({
        ...(command.payload.price !== undefined
          ? { price: command.payload.price }
          : {}),
        ...(command.payload.comparePrice !== undefined
          ? { comparePrice: command.payload.comparePrice }
          : {}),
        ...(command.payload.stock !== undefined
          ? { stock: command.payload.stock }
          : {}),
        ...(command.payload.sku !== undefined
          ? {
              sku:
                command.payload.sku?.trim().toUpperCase() || defaultVariant.sku,
            }
          : {}),
      });
      await this.productRepository.saveVariant(defaultVariant);
      product.syncProjection();
    }
    product.update(update);
    return this.productRepository.save(product);
  }
}
