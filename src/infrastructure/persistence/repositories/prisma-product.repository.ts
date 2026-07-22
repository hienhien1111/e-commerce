import { Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import type { ProductRepositoryPort } from '@/application/catalog/ports/product.repository.port';
import { Product } from '@/domain/entities/product';
import { ProductVariant } from '@/domain/entities/product-variant';
import {
  ProductMapper,
  PrismaProductWithImages,
} from '@/infrastructure/persistence/mappers/product.mapper';
import { NullableType } from '@/utils/types/nullable.type';
import {
  ProductFilters,
  AdminProductFilters,
  ProductPage,
} from '@/application/catalog/types/catalog.types';

const PRODUCT_IMAGES_INCLUDE = {
  images: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
  variants: {
    where: { deletedAt: null },
    orderBy: [{ createdAt: 'asc' }],
    include: { image: true },
  },
} as const satisfies Prisma.ProductInclude;

const PUBLIC_PRODUCT_INCLUDE = {
  images: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
  variants: {
    where: { deletedAt: null, isActive: true },
    orderBy: [{ createdAt: 'asc' }],
    include: { image: true },
  },
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
        variants: {
          create: product.variants.map((variant) => {
            const { productId: _productId, ...data } =
              ProductMapper.variantToPersistence(variant);
            return data;
          }),
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
      // Image mutations are performed through the Product aggregate too. Do
      // not recreate all rows: doing so would trigger ON DELETE SET NULL on
      // variants that selected an existing image.
      const imageIds = product.images.map((image) => image.id);
      if (imageIds.length > 0) {
        await Promise.all(
          product.images.map((image) =>
            transaction.productImage.upsert({
              where: { id: image.id },
              create: {
                productId: product.id,
                ...ProductMapper.imageToPersistence(image),
              },
              update: ProductMapper.imageToPersistence(image),
            }),
          ),
        );
      }
      await transaction.productImage.deleteMany({
        where: {
          productId: product.id,
          ...(imageIds.length > 0 ? { id: { notIn: imageIds } } : {}),
        },
      });
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
      where: {
        id,
        deletedAt: null,
        isActive: true,
        variants: { some: { deletedAt: null, isActive: true } },
      },
      include: PUBLIC_PRODUCT_INCLUDE,
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
    const product = await this.prisma.product.findFirst({
      where: { variants: { some: { sku, deletedAt: null } } },
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
      variants: { some: { deletedAt: null, isActive: true } },
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
      include: PUBLIC_PRODUCT_INCLUDE,
    });
    const hasNext = rows.length > limit;
    const data = rows
      .slice(0, limit)
      .map((row) => ProductMapper.toDomain(row as PrismaProductWithImages));
    return { data, nextCursor: hasNext ? (data.at(-1)?.id ?? null) : null };
  }

  async findAdminPage({
    filters,
    cursor,
    limit,
  }: {
    filters: AdminProductFilters;
    cursor: string | null;
    limit: number;
  }): Promise<ProductPage> {
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      // Product is an aggregate with at least one non-deleted variant. Older
      // data created before variants were introduced can violate that
      // invariant; keep a single bad row from turning the entire admin page
      // into a 500 while the data-repair migration restores it.
      variants: { some: { deletedAt: null } },
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.isActive === undefined ? {} : { isActive: filters.isActive }),
      ...(filters.search
        ? { name: { contains: filters.search, mode: 'insensitive' } }
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

  async createVariant(variant: ProductVariant): Promise<ProductVariant> {
    const created = await this.prisma.$transaction(async (transaction) => {
      const row = await transaction.productVariant.create({
        data: ProductMapper.variantToPersistence(variant),
        include: { image: true },
      });
      await this.syncProjection(transaction, variant.productId);
      return row;
    });
    return ProductMapper.variantToDomain(created);
  }

  async saveVariant(variant: ProductVariant): Promise<ProductVariant> {
    const saved = await this.prisma.$transaction(async (transaction) => {
      const row = await transaction.productVariant.update({
        where: { id: variant.id },
        data: {
          label: variant.label,
          sku: variant.sku,
          price: variant.price,
          comparePrice: variant.comparePrice,
          stock: variant.stock,
          isActive: variant.isActive,
          imageId: variant.imageId,
          updatedAt: variant.updatedAt,
          deletedAt: variant.deletedAt,
        },
        include: { image: true },
      });
      await this.syncProjection(transaction, variant.productId);
      return row;
    });
    return ProductMapper.variantToDomain(saved);
  }

  async softDeleteVariant(variant: ProductVariant): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.productVariant.update({
        where: { id: variant.id },
        data: { deletedAt: variant.deletedAt, updatedAt: variant.updatedAt },
      });
      await this.syncProjection(transaction, variant.productId);
    });
  }

  private async syncProjection(
    transaction: Prisma.TransactionClient,
    productId: string,
  ): Promise<void> {
    const variants = await transaction.productVariant.findMany({
      where: { productId, deletedAt: null, isActive: true },
      orderBy: { price: 'asc' },
    });
    if (variants.length === 0) return;
    const lowest = variants[0];
    await transaction.product.update({
      where: { id: productId },
      data: {
        price: lowest.price,
        comparePrice: lowest.comparePrice,
        stock: variants.reduce((total, variant) => total + variant.stock, 0),
        sku: variants.length === 1 ? variants[0].sku : null,
      },
    });
  }
}
