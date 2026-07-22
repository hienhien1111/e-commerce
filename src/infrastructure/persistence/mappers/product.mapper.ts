import type {
  Product as PrismaProduct,
  ProductImage as PrismaProductImage,
  ProductVariant as PrismaProductVariant,
} from '@/generated/prisma/client';
import { Product } from '@/domain/entities/product';
import { ProductImage } from '@/domain/entities/product-image';
import { ProductFactory } from '@/domain/factories/product.factory';
import { ProductImageFactory } from '@/domain/factories/product-image.factory';
import { ProductVariant } from '@/domain/entities/product-variant';
import { ProductVariantFactory } from '@/domain/factories/product-variant.factory';

export type PrismaProductWithImages = PrismaProduct & {
  images: PrismaProductImage[];
  variants: Array<PrismaProductVariant & { image: PrismaProductImage | null }>;
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
      variants: raw.variants.map((variant) => this.variantToDomain(variant)),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
    });
  }

  static variantToDomain(
    raw: PrismaProductVariant & { image: PrismaProductImage | null },
  ): ProductVariant {
    return ProductVariantFactory.reconstitute({
      id: raw.id,
      productId: raw.productId,
      label: raw.label,
      sku: raw.sku,
      price: raw.price.toNumber(),
      comparePrice: raw.comparePrice?.toNumber() ?? null,
      stock: raw.stock,
      isActive: raw.isActive,
      imageId: raw.imageId,
      imageUrl: raw.image?.url ?? null,
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
      // ProductVariant is the SKU source of truth. The legacy Product.sku
      // column stays null so it cannot introduce a second uniqueness rule.
      sku: null,
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

  static variantToPersistence(variant: ProductVariant) {
    return {
      id: variant.id,
      productId: variant.productId,
      label: variant.label,
      sku: variant.sku,
      price: variant.price,
      comparePrice: variant.comparePrice,
      stock: variant.stock,
      isActive: variant.isActive,
      imageId: variant.imageId,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt,
      deletedAt: variant.deletedAt,
    };
  }
}
