import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import type { OrderRepositoryPort } from '@/application/order/ports/order.repository.port';
import type { OrderCheckoutPort } from '@/application/order/ports/order-checkout.port';
import type { OrderCancellationPort } from '@/application/order/ports/order-cancellation.port';
import {
  AdminOrderFilters,
  OrderFilters,
  OrderPage,
  OrderStats,
} from '@/application/order/types/order.types';
import { Order, ShippingAddress } from '@/domain/entities/order';
import { OrderStatusEnum } from '@/domain/enums/order-status.enum';
import { PaymentStatusEnum } from '@/domain/enums/payment-status.enum';
import { DiscountTypeEnum } from '@/domain/enums/discount-type.enum';
import { generateUuidV7 } from '@/utils/uuid-v7';
import { NullableType } from '@/utils/types/nullable.type';
import {
  OrderMapper,
  PrismaOrderWithRelations,
} from '@/infrastructure/persistence/mappers/order.mapper';

const ORDER_INCLUDE = {
  items: { orderBy: { id: 'asc' } },
  user: { select: { id: true, email: true, firstName: true, lastName: true } },
} as const satisfies Prisma.OrderInclude;

const emptyCounts = (): Record<OrderStatusEnum, number> => ({
  [OrderStatusEnum.PENDING]: 0,
  [OrderStatusEnum.CONFIRMED]: 0,
  [OrderStatusEnum.PROCESSING]: 0,
  [OrderStatusEnum.SHIPPED]: 0,
  [OrderStatusEnum.DELIVERED]: 0,
  [OrderStatusEnum.CANCELLED]: 0,
});

@Injectable()
export class PrismaOrderRepository
  implements OrderRepositoryPort, OrderCheckoutPort, OrderCancellationPort
{
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<NullableType<Order>> {
    const row = await this.prisma.order.findFirst({
      where: { id, deletedAt: null },
      include: ORDER_INCLUDE,
    });
    return row ? OrderMapper.toDomain(row as PrismaOrderWithRelations) : null;
  }

  async findByIdForUser(
    id: string,
    userId: string,
  ): Promise<NullableType<Order>> {
    const row = await this.prisma.order.findFirst({
      where: { id, userId, deletedAt: null },
      include: ORDER_INCLUDE,
    });
    return row ? OrderMapper.toDomain(row as PrismaOrderWithRelations) : null;
  }

  async findPageForUser(
    userId: string,
    filters: OrderFilters,
  ): Promise<OrderPage> {
    return this.findPage(
      {
        userId,
        deletedAt: null,
        ...(filters.status ? { status: filters.status } : {}),
      },
      filters,
    );
  }

  async findAdminPage(filters: AdminOrderFilters): Promise<OrderPage> {
    const where: Prisma.OrderWhereInput = {
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    };
    return this.findPage(where, filters);
  }

  async getStats(
    filters: Pick<AdminOrderFilters, 'from' | 'to'>,
  ): Promise<OrderStats> {
    const dateFilter =
      filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {};
    const [groups, revenue] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['status'],
        where: { deletedAt: null, ...dateFilter },
        _count: { _all: true },
      }),
      this.prisma.order.aggregate({
        where: {
          deletedAt: null,
          status: { not: OrderStatusEnum.CANCELLED },
          ...dateFilter,
        },
        _sum: { total: true },
      }),
    ]);
    const counts = emptyCounts();
    for (const group of groups)
      counts[group.status as OrderStatusEnum] = group._count._all;
    return { counts, totalRevenue: revenue._sum.total?.toNumber() ?? 0 };
  }

  async save(order: Order): Promise<Order> {
    const saved = await this.prisma.order.update({
      where: { id: order.id },
      data: { status: order.status, updatedAt: order.updatedAt },
      include: ORDER_INCLUDE,
    });
    return OrderMapper.toDomain(saved as PrismaOrderWithRelations);
  }

  async checkout(input: {
    userId: string;
    shippingAddress: ShippingAddress;
  }): Promise<Order> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "carts" WHERE "user_id" = ${input.userId} FOR UPDATE`;
      const cart = await tx.cart.findUnique({
        where: { userId: input.userId },
        include: { items: { orderBy: { id: 'asc' } } },
      });
      if (!cart || cart.items.length === 0) {
        throw new UnprocessableEntityException('Cart is empty');
      }

      const productIds = cart.items.map((item) => item.productId);
      await tx.$queryRaw`SELECT "id" FROM "products" WHERE "id" IN (${Prisma.join(productIds)}) FOR UPDATE`;
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        include: {
          images: {
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
            take: 1,
          },
        },
      });
      const byId = new Map(products.map((product) => [product.id, product]));
      for (const item of cart.items) {
        const product = byId.get(item.productId);
        if (
          !product ||
          product.deletedAt ||
          !product.isActive ||
          product.stock < item.quantity
        ) {
          throw new UnprocessableEntityException(
            'Cart contains unavailable or insufficient-stock products',
          );
        }
      }

      const subtotal = cart.items.reduce(
        (sum, item) =>
          sum +
          (byId.get(item.productId)?.price.toNumber() ?? 0) * item.quantity,
        0,
      );
      let discountAmount = 0;
      let couponId: string | null = null;
      if (cart.couponId) {
        await tx.$queryRaw`SELECT "id" FROM "coupons" WHERE "id" = ${cart.couponId} FOR UPDATE`;
        const coupon = await tx.coupon.findFirst({
          where: { id: cart.couponId, deletedAt: null },
        });
        if (!coupon)
          throw new UnprocessableEntityException(
            'Applied coupon is no longer valid',
          );
        const invalid =
          !coupon.isActive ||
          (coupon.expiresAt !== null && coupon.expiresAt <= new Date()) ||
          (coupon.maxUsage !== null && coupon.usedCount >= coupon.maxUsage) ||
          (coupon.minOrderAmount !== null &&
            subtotal < coupon.minOrderAmount.toNumber());
        if (invalid)
          throw new UnprocessableEntityException(
            'Applied coupon is no longer valid',
          );
        const value = coupon.discountValue.toNumber();
        discountAmount =
          coupon.discountType === DiscountTypeEnum.FIXED_AMOUNT
            ? Math.min(value, subtotal)
            : Math.min(
                Math.floor((subtotal * value) / 100),
                coupon.maxDiscount?.toNumber() ?? Number.MAX_SAFE_INTEGER,
                subtotal,
              );
        couponId = coupon.id;
      }

      const orderId = generateUuidV7();
      const created = await tx.order.create({
        data: {
          id: orderId,
          userId: input.userId,
          status: OrderStatusEnum.PENDING,
          subtotal,
          discountAmount,
          total: subtotal - discountAmount,
          paymentStatus: PaymentStatusEnum.PENDING,
          shippingAddress:
            input.shippingAddress as unknown as Prisma.InputJsonValue,
          couponId,
          items: {
            create: cart.items.map((item) => {
              const product = byId.get(item.productId)!;
              const unitPrice = product.price.toNumber();
              return {
                id: generateUuidV7(),
                productId: item.productId,
                quantity: item.quantity,
                unitPrice,
                totalPrice: unitPrice * item.quantity,
                snapshot: {
                  name: product.name,
                  sku: product.sku,
                  imageUrl: product.images[0]?.url ?? null,
                },
              };
            }),
          },
        },
        include: ORDER_INCLUDE,
      });
      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });
        await tx.couponUsage.create({
          data: {
            id: generateUuidV7(),
            couponId,
            userId: input.userId,
            orderId,
          },
        });
      }
      await tx.cart.delete({ where: { id: cart.id } });
      return OrderMapper.toDomain(created as PrismaOrderWithRelations);
    });
  }

  async cancel(input: {
    orderId: string;
    allowProcessing: boolean;
  }): Promise<Order> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "orders" WHERE "id" = ${input.orderId} FOR UPDATE`;
      const order = await tx.order.findFirst({
        where: { id: input.orderId, deletedAt: null },
        include: { items: true, couponUsages: true },
      });
      if (!order)
        throw new UnprocessableEntityException('Order no longer exists');
      const validStatus =
        order.status === OrderStatusEnum.PENDING ||
        order.status === OrderStatusEnum.CONFIRMED ||
        (input.allowProcessing && order.status === OrderStatusEnum.PROCESSING);
      if (!validStatus || order.paymentStatus === PaymentStatusEnum.PAID) {
        throw new UnprocessableEntityException('Order cannot be cancelled');
      }
      await tx.$queryRaw`SELECT "id" FROM "products" WHERE "id" IN (${Prisma.join(order.items.map((item) => item.productId))}) FOR UPDATE`;
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
      for (const usage of order.couponUsages) {
        await tx.coupon.updateMany({
          where: { id: usage.couponId, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
        await tx.couponUsage.delete({ where: { id: usage.id } });
      }
      const cancelled = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatusEnum.CANCELLED },
        include: ORDER_INCLUDE,
      });
      return OrderMapper.toDomain(cancelled as PrismaOrderWithRelations);
    });
  }

  private async findPage(
    where: Prisma.OrderWhereInput,
    filters: OrderFilters,
  ): Promise<OrderPage> {
    const rows = await this.prisma.order.findMany({
      where: {
        ...where,
        ...(filters.cursor ? { id: { gt: filters.cursor } } : {}),
      },
      orderBy: { id: 'asc' },
      take: filters.limit + 1,
      include: ORDER_INCLUDE,
    });
    const hasNext = rows.length > filters.limit;
    const data = rows
      .slice(0, filters.limit)
      .map((row) => OrderMapper.toDomain(row as PrismaOrderWithRelations));
    return { data, nextCursor: hasNext ? (data.at(-1)?.id ?? null) : null };
  }
}
