import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import type { CartRepositoryPort } from '@/application/cart/ports/cart.repository.port';
import type { CartProductLookupPort } from '@/application/cart/ports/cart-product-lookup.port';
import { CartProductSnapshot } from '@/application/cart/types/cart.types';
import { Cart } from '@/domain/entities/cart';
import {
  CartMapper,
  PrismaCartWithItems,
} from '@/infrastructure/persistence/mappers/cart.mapper';
import { NullableType } from '@/utils/types/nullable.type';

const CART_ITEMS_INCLUDE = {
  items: { orderBy: { createdAt: 'asc' } },
} as const;

@Injectable()
export class PrismaCartRepository
  implements CartRepositoryPort, CartProductLookupPort
{
  constructor(private readonly prisma: PrismaService) {}

  async create(cart: Cart): Promise<Cart> {
    const created = await this.prisma.cart.create({
      data: {
        id: cart.id,
        userId: cart.userId,
        couponId: cart.couponId,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
        items: {
          create: cart.items.map((item) => ({
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          })),
        },
      },
      include: CART_ITEMS_INCLUDE,
    });
    return CartMapper.toDomain(created as PrismaCartWithItems);
  }

  async save(cart: Cart): Promise<Cart> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.cart.update({
        where: { id: cart.id },
        data: { couponId: cart.couponId, updatedAt: cart.updatedAt },
      });
      await transaction.cartItem.deleteMany({ where: { cartId: cart.id } });
      if (cart.items.length > 0) {
        await transaction.cartItem.createMany({
          data: cart.items.map((item) => ({
            id: item.id,
            cartId: cart.id,
            productId: item.productId,
            quantity: item.quantity,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          })),
        });
      }
    });
    const saved = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: CART_ITEMS_INCLUDE,
    });
    if (!saved) throw new Error('Cart disappeared while saving');
    return CartMapper.toDomain(saved as PrismaCartWithItems);
  }

  async findByUserId(userId: string): Promise<NullableType<Cart>> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: CART_ITEMS_INCLUDE,
    });
    return cart ? CartMapper.toDomain(cart as PrismaCartWithItems) : null;
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prisma.cart.deleteMany({ where: { userId } });
  }

  async findByIds(ids: string[]): Promise<CartProductSnapshot[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      include: {
        images: {
          orderBy: [
            { isPrimary: 'desc' },
            { sortOrder: 'asc' },
            { createdAt: 'asc' },
          ],
          take: 1,
        },
      },
    });
    return rows.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price.toNumber(),
      stock: product.stock,
      isActive: product.isActive,
      deletedAt: product.deletedAt,
      thumbnailUrl: product.images[0]?.url ?? null,
    }));
  }
}
