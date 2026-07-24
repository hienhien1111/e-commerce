import { Injectable } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import type { OrderRepositoryPort } from '@/application/order/ports/order.repository.port';
import {
  AdminOrderFilters,
  OrderFilters,
  OrderPage,
  OrderStats,
} from '@/application/order/types/order.types';
import { Order } from '@/domain/entities/order';
import { OrderStatusEnum } from '@/domain/enums/order-status.enum';
import { PaymentStatusEnum } from '@/domain/enums/payment-status.enum';
import { NullableType } from '@/utils/types/nullable.type';
import {
  OrderMapper,
  PrismaOrderWithRelations,
} from '@/infrastructure/persistence/mappers/order.mapper';
import { generateUuidV7 } from '@/utils/uuid-v7';
import { CommerceEventType } from '@/infrastructure/messaging/commerce-event.constants';

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
export class PrismaOrderRepository implements OrderRepositoryPort {
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
    const exactOrderId =
      filters.search &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        filters.search,
      )
        ? filters.search
        : undefined;
    const where: Prisma.OrderWhereInput = {
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.paymentMethod
        ? { paymentMethod: filters.paymentMethod }
        : {}),
      ...(filters.paymentStatus
        ? { paymentStatus: filters.paymentStatus }
        : {}),
      ...(filters.reservationStatus
        ? { reservationStatus: filters.reservationStatus }
        : {}),
      ...(filters.search
        ? {
            OR: [
              ...(exactOrderId ? [{ id: exactOrderId }] : []),
              {
                user: {
                  is: {
                    OR: [
                      {
                        email: {
                          contains: filters.search,
                          mode: 'insensitive' as const,
                        },
                      },
                      {
                        firstName: {
                          contains: filters.search,
                          mode: 'insensitive' as const,
                        },
                      },
                      {
                        lastName: {
                          contains: filters.search,
                          mode: 'insensitive' as const,
                        },
                      },
                    ],
                  },
                },
              },
              {
                shippingAddress: {
                  path: ['phone'],
                  string_contains: filters.search,
                },
              },
            ],
          }
        : {}),
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
    const countDateFilter =
      filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {};
    const revenueDateFilter =
      filters.from || filters.to
        ? {
            paidAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {};
    const [groups, revenue] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['status'],
        where: { deletedAt: null, ...countDateFilter },
        _count: { _all: true },
      }),
      this.prisma.order.aggregate({
        where: {
          deletedAt: null,
          paymentStatus: PaymentStatusEnum.PAID,
          ...revenueDateFilter,
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
    const saved = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "orders" WHERE "id" = ${order.id}::uuid FOR UPDATE`;
      const current = await tx.order.findUnique({
        where: { id: order.id },
        select: { status: true },
      });
      if (!current) throw new Error('Order disappeared while saving');
      const saved = await tx.order.update({
        where: { id: order.id },
        data: OrderMapper.toPersistence(order),
        include: ORDER_INCLUDE,
      });
      if (
        current.status !== OrderStatusEnum.SHIPPED &&
        order.status === OrderStatusEnum.SHIPPED
      ) {
        await this.fulfillReservedInventory(tx, order.id);
      }
      return saved;
    });
    return OrderMapper.toDomain(saved as PrismaOrderWithRelations);
  }

  private async fulfillReservedInventory(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<void> {
    const reservations = await tx.inventoryReservation.findMany({
      where: { orderId, status: 'RESERVED' },
      include: { variant: { select: { productId: true } } },
    });
    if (reservations.length === 0) return;
    const warehouseIds = [
      ...new Set(reservations.map((item) => item.warehouseId)),
    ].sort();
    const variantIds = [
      ...new Set(reservations.map((item) => item.variantId)),
    ].sort();
    await tx.$queryRaw`SELECT "variant_id" FROM "inventory_balances" WHERE "warehouse_id" IN (${Prisma.join(warehouseIds)}) AND "variant_id" IN (${Prisma.join(variantIds)}) ORDER BY "warehouse_id", "variant_id" FOR UPDATE`;
    for (const reservation of reservations) {
      await tx.inventoryBalance.update({
        where: {
          warehouseId_variantId: {
            warehouseId: reservation.warehouseId,
            variantId: reservation.variantId,
          },
        },
        data: {
          onHand: { decrement: reservation.quantity },
          reserved: { decrement: reservation.quantity },
        },
      });
      await tx.inventoryReservation.update({
        where: { id: reservation.id },
        data: { status: 'FULFILLED', releasedAt: new Date() },
      });
      await tx.inventoryMovement.create({
        data: {
          id: generateUuidV7(),
          eventId: `order-fulfillment:${orderId}:${reservation.variantId}`,
          warehouseId: reservation.warehouseId,
          variantId: reservation.variantId,
          reservationId: reservation.id,
          orderId,
          type: 'FULFILLMENT',
          quantity: -reservation.quantity,
          note: 'Order shipped',
        },
      });
    }
    for (const productId of [
      ...new Set(reservations.map((item) => item.variant.productId)),
    ].sort()) {
      await tx.outboxMessage.create({
        data: {
          id: generateUuidV7(),
          aggregateType: 'Product',
          aggregateId: productId,
          eventType: CommerceEventType.CATALOG_PROJECTION_REFRESH_REQUESTED,
          payload: { productId },
        },
      });
    }
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
