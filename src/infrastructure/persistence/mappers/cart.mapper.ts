import type {
  Cart as PrismaCart,
  CartItem as PrismaCartItem,
} from '@/generated/prisma/client';
import { Cart } from '@/domain/entities/cart';
import { CartFactory } from '@/domain/factories/cart.factory';
import { CartItemFactory } from '@/domain/factories/cart-item.factory';

export type PrismaCartWithItems = PrismaCart & { items: PrismaCartItem[] };

export class CartMapper {
  static toDomain(raw: PrismaCartWithItems): Cart {
    return CartFactory.reconstitute({
      id: raw.id,
      userId: raw.userId,
      couponId: raw.couponId,
      items: raw.items.map((item) =>
        CartItemFactory.reconstitute({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }),
      ),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}
