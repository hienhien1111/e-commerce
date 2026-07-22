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
            variantId: item.variantId,
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
            variantId: item.variantId,
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

  async findByIds(variantIds: string[]): Promise<CartProductSnapshot[]> {
    if (variantIds.length === 0) return [];
    const rows = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          include: {
            images: {
              orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
              take: 1,
            },
          },
        },
        image: true,
      },
    });
    return rows.map((variant) => this.variantSnapshot(variant));
  }

  async findSingleActiveByProductId(
    productId: string,
  ): Promise<CartProductSnapshot | null> {
    const variants = await this.prisma.productVariant.findMany({
      where: { productId, deletedAt: null, isActive: true },
      orderBy: { createdAt: 'asc' },
      take: 2,
      include: {
        product: {
          include: {
            images: {
              orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
              take: 1,
            },
          },
        },
        image: true,
      },
    });
    return variants.length === 1 ? this.variantSnapshot(variants[0]) : null;
  }

  private variantSnapshot(variant: {
    id: string;
    productId: string;
    label: string | null;
    sku: string;
    price: { toNumber(): number };
    stock: number;
    isActive: boolean;
    deletedAt: Date | null;
    image: { url: string } | null;
    product: {
      name: string;
      slug: string;
      isActive: boolean;
      deletedAt: Date | null;
      images: Array<{ url: string }>;
    };
  }): CartProductSnapshot {
    return {
      id: variant.productId,
      variantId: variant.id,
      name: variant.product.name,
      slug: variant.product.slug,
      label: variant.label,
      sku: variant.sku,
      price: variant.price.toNumber(),
      stock: variant.stock,
      isActive: variant.isActive && variant.product.isActive,
      deletedAt: variant.deletedAt ?? variant.product.deletedAt,
      thumbnailUrl:
        variant.image?.url ?? variant.product.images[0]?.url ?? null,
    };
  }
}
