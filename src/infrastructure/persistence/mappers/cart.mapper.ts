import type {
  Cart as PrismaCart,
  CartItem as PrismaCartItem,
} from '@/generated/prisma/client';
import { Cart } from '@/domain/entities/cart';
import { CartFactory } from '@/domain/factories/cart.factory';
import { CartItemFactory } from '@/domain/factories/cart-item.factory';
import { Prisma } from '@/generated/prisma/client';

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
          variantId: item.variantId,
          quantity: item.quantity,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }),
      ),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(cart: Cart): Prisma.CartUncheckedCreateInput {
    return {
      id: cart.id,
      userId: cart.userId,
      couponId: cart.couponId,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      items: {
        create: cart.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
      },
    };
  }
}
