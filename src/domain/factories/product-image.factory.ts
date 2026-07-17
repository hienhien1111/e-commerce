import {
  ProductImage,
  ProductImageProps,
} from '@/domain/entities/product-image';
import { generateUuidV7 } from '@/utils/uuid-v7';

export type CreateProductImageInput = ProductImageProps & { id?: string };
export type ReconstituteProductImageInput = ProductImageProps & {
  id: string;
  createdAt: Date;
};

export class ProductImageFactory {
  static create(input: CreateProductImageInput): ProductImage {
    return ProductImage._create(input, input.id ?? generateUuidV7());
  }

  static reconstitute(input: ReconstituteProductImageInput): ProductImage {
    return ProductImage._create(
      input,
      input.id,
      input.createdAt,
      input.createdAt,
    );
  }
}
