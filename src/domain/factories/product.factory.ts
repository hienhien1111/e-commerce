import { Product, ProductProps } from '@/domain/entities/product';
import { generateUuidV7 } from '@/utils/uuid-v7';

export type CreateProductInput = ProductProps & { id?: string };
export type ReconstituteProductInput = ProductProps & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export class ProductFactory {
  static create(input: CreateProductInput): Product {
    return Product._create(input, input.id ?? generateUuidV7());
  }

  static reconstitute(input: ReconstituteProductInput): Product {
    return Product._create(
      input,
      input.id,
      input.createdAt,
      input.updatedAt,
      input.deletedAt,
    );
  }
}
