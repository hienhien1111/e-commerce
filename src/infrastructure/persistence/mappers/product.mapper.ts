import type {
  Product as PrismaProduct,
  ProductImage as PrismaProductImage,
} from '@/generated/prisma/client';
import { Product } from '@/domain/entities/product';
import { ProductImage } from '@/domain/entities/product-image';
import { ProductFactory } from '@/domain/factories/product.factory';
import { ProductImageFactory } from '@/domain/factories/product-image.factory';

export type PrismaProductWithImages = PrismaProduct & {
  images: PrismaProductImage[];
};

export class ProductMapper {
  static imageToDomain(raw: PrismaProductImage): ProductImage {
    return ProductImageFactory.reconstitute({
      id: raw.id,
      url: raw.url,
      publicId: raw.publicId,
      isPrimary: raw.isPrimary,
      sortOrder: raw.sortOrder,
      createdAt: raw.createdAt,
    });
  }

  static toDomain(raw: PrismaProductWithImages): Product {
    return ProductFactory.reconstitute({
      id: raw.id,
      name: raw.name,
      slug: raw.slug,
      description: raw.description,
      price: raw.price.toNumber(),
      comparePrice: raw.comparePrice?.toNumber() ?? null,
      stock: raw.stock,
      sku: raw.sku,
      categoryId: raw.categoryId,
      isActive: raw.isActive,
      images: raw.images.map((image) => this.imageToDomain(image)),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
    });
  }

  static toPersistence(product: Product) {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      comparePrice: product.comparePrice,
      stock: product.stock,
      sku: product.sku,
      categoryId: product.categoryId,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      deletedAt: product.deletedAt,
    };
  }

  static imageToPersistence(image: ProductImage) {
    return {
      id: image.id,
      url: image.url,
      publicId: image.publicId,
      isPrimary: image.isPrimary,
      sortOrder: image.sortOrder,
      createdAt: image.createdAt,
    };
  }
}
