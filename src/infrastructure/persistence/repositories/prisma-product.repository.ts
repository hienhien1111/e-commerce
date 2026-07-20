import { Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import type { ProductRepositoryPort } from '@/application/catalog/ports/product.repository.port';
import { Product } from '@/domain/entities/product';
import {
  ProductMapper,
  PrismaProductWithImages,
} from '@/infrastructure/persistence/mappers/product.mapper';
import { NullableType } from '@/utils/types/nullable.type';
import {
  ProductFilters,
  ProductPage,
} from '@/application/catalog/types/catalog.types';

const PRODUCT_IMAGES_INCLUDE = {
  images: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
} as const satisfies Prisma.ProductInclude;

@Injectable()
export class PrismaProductRepository implements ProductRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(product: Product): Promise<Product> {
    const data = ProductMapper.toPersistence(product);
    const created = await this.prisma.product.create({
      data: {
        ...data,
        images: {
          create: product.images.map((image) =>
            ProductMapper.imageToPersistence(image),
          ),
        },
      },
      include: PRODUCT_IMAGES_INCLUDE,
    });
    return ProductMapper.toDomain(created as PrismaProductWithImages);
  }

  async save(product: Product): Promise<Product> {
    const data = ProductMapper.toPersistence(product);
    await this.prisma.$transaction(async (transaction) => {
      await transaction.product.update({
        where: { id: product.id },
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          price: data.price,
          comparePrice: data.comparePrice,
          stock: data.stock,
          sku: data.sku,
          categoryId: data.categoryId,
          isActive: data.isActive,
          updatedAt: data.updatedAt,
          deletedAt: data.deletedAt,
        },
      });
      await transaction.productImage.deleteMany({
        where: { productId: product.id },
      });
      if (product.images.length > 0) {
        await transaction.productImage.createMany({
          data: product.images.map((image) => ({
            productId: product.id,
            ...ProductMapper.imageToPersistence(image),
          })),
        });
      }
    });
    const saved = await this.prisma.product.findUnique({
      where: { id: product.id },
      include: PRODUCT_IMAGES_INCLUDE,
    });
    if (!saved) throw new Error('Product disappeared while saving');
    return ProductMapper.toDomain(saved as PrismaProductWithImages);
  }

  async findById(id: string): Promise<NullableType<Product>> {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: PRODUCT_IMAGES_INCLUDE,
    });
    return product
      ? ProductMapper.toDomain(product as PrismaProductWithImages)
      : null;
  }

  async findPublicById(id: string): Promise<NullableType<Product>> {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null, isActive: true },
      include: PRODUCT_IMAGES_INCLUDE,
    });
    return product
      ? ProductMapper.toDomain(product as PrismaProductWithImages)
      : null;
  }

  async findBySlug(slug: string): Promise<NullableType<Product>> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: PRODUCT_IMAGES_INCLUDE,
    });
    return product
      ? ProductMapper.toDomain(product as PrismaProductWithImages)
      : null;
  }

  async findBySku(sku: string): Promise<NullableType<Product>> {
    const product = await this.prisma.product.findUnique({
      where: { sku },
      include: PRODUCT_IMAGES_INCLUDE,
    });
    return product
      ? ProductMapper.toDomain(product as PrismaProductWithImages)
      : null;
  }

  async findPublicPage({
    filters,
    cursor,
    limit,
  }: {
    filters: ProductFilters;
    cursor: string | null;
    limit: number;
  }): Promise<ProductPage> {
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      isActive: true,
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.search
        ? { name: { contains: filters.search, mode: 'insensitive' } }
        : {}),
      ...(filters.minPrice !== undefined || filters.maxPrice !== undefined
        ? {
            price: {
              ...(filters.minPrice !== undefined
                ? { gte: filters.minPrice }
                : {}),
              ...(filters.maxPrice !== undefined
                ? { lte: filters.maxPrice }
                : {}),
            },
          }
        : {}),
      ...(cursor ? { id: { gt: cursor } } : {}),
    };
    const rows = await this.prisma.product.findMany({
      where,
      orderBy: { id: 'asc' },
      take: limit + 1,
      include: PRODUCT_IMAGES_INCLUDE,
    });
    const hasNext = rows.length > limit;
    const data = rows
      .slice(0, limit)
      .map((row) => ProductMapper.toDomain(row as PrismaProductWithImages));
    return { data, nextCursor: hasNext ? (data.at(-1)?.id ?? null) : null };
  }

  async existsByCategoryId(categoryId: string): Promise<boolean> {
    return Boolean(
      await this.prisma.product.findFirst({
        where: { categoryId, deletedAt: null },
        select: { id: true },
      }),
    );
  }
}
