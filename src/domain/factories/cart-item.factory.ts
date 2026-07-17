import { CartItem, CartItemProps } from '@/domain/entities/cart-item';
import { generateUuidV7 } from '@/utils/uuid-v7';

export type CreateCartItemInput = CartItemProps & { id?: string };
export type ReconstituteCartItemInput = CartItemProps & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

export class CartItemFactory {
  static create(input: CreateCartItemInput): CartItem {
    return CartItem._create(input, input.id ?? generateUuidV7());
  }

  static reconstitute(input: ReconstituteCartItemInput): CartItem {
    return CartItem._create(input, input.id, input.createdAt, input.updatedAt);
  }
}
