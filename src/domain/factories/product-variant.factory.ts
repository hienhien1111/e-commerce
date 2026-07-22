import {
  ProductVariant,
  ProductVariantProps,
} from '@/domain/entities/product-variant';
import { generateUuidV7 } from '@/utils/uuid-v7';

export type CreateProductVariantInput = ProductVariantProps & { id?: string };
export type ReconstituteProductVariantInput = ProductVariantProps & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export class ProductVariantFactory {
  static create(input: CreateProductVariantInput): ProductVariant {
    return ProductVariant._create(input, input.id ?? generateUuidV7());
  }

  static reconstitute(input: ReconstituteProductVariantInput): ProductVariant {
    return ProductVariant._create(
      input,
      input.id,
      input.createdAt,
      input.updatedAt,
      input.deletedAt,
    );
  }
}
