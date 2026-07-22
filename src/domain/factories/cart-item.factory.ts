import { CartItem, CartItemProps } from '@/domain/entities/cart-item';
import { generateUuidV7 } from '@/utils/uuid-v7';

export type CreateCartItemInput = Omit<CartItemProps, 'variantId'> & {
  variantId?: string;
  id?: string;
};
export type ReconstituteCartItemInput = Omit<CartItemProps, 'variantId'> & {
  variantId?: string;
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

export class CartItemFactory {
  static create(input: CreateCartItemInput): CartItem {
    return CartItem._create(
      { ...input, variantId: input.variantId ?? input.productId },
      input.id ?? generateUuidV7(),
    );
  }

  static reconstitute(input: ReconstituteCartItemInput): CartItem {
    return CartItem._create(
      { ...input, variantId: input.variantId ?? input.productId },
      input.id,
      input.createdAt,
      input.updatedAt,
    );
  }
}
