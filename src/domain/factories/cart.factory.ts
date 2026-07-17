import { Cart, CartProps } from '@/domain/entities/cart';
import { generateUuidV7 } from '@/utils/uuid-v7';

export type CreateCartInput = CartProps & { id?: string };
export type ReconstituteCartInput = CartProps & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

export class CartFactory {
  static create(input: CreateCartInput): Cart {
    return Cart._create(input, input.id ?? generateUuidV7());
  }

  static reconstitute(input: ReconstituteCartInput): Cart {
    return Cart._create(input, input.id, input.createdAt, input.updatedAt);
  }
}
