import { Injectable } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import { DiscountTypeEnum } from '@/domain/enums/discount-type.enum';
import { OrderStatusEnum } from '@/domain/enums/order-status.enum';
import { ReservationStatusEnum } from '@/domain/enums/reservation-status.enum';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import {
  CommerceEventType,
  OrderReleaseRequestedPayload,
  OrderSubmittedPayload,
} from '@/infrastructure/messaging/commerce-event.constants';
import { generateUuidV7 } from '@/utils/uuid-v7';

type ReservationResult = 'RESERVED' | 'FAILED' | 'IGNORED';
const DEFAULT_WAREHOUSE_CODE = 'DEFAULT';

@Injectable()
export class PrismaCommerceSagaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async reserveOrder(
    payload: OrderSubmittedPayload,
  ): Promise<ReservationResult> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "orders" WHERE "id" = ${payload.orderId}::uuid FOR UPDATE`;
      const order = await tx.order.findFirst({
        where: { id: payload.orderId, deletedAt: null },
        include: { items: true },
      });
      if (
        !order ||
        order.status === OrderStatusEnum.CANCELLED ||
        order.reservationStatus !== ReservationStatusEnum.PENDING
      ) {
        return 'IGNORED';
      }

      if (payload.cartId) {
        await tx.$queryRaw`SELECT "id" FROM "carts" WHERE "id" = ${payload.cartId}::uuid FOR UPDATE`;
      }
      const productIds = [
        ...new Set(order.items.map((item) => item.productId)),
      ].sort();
      const variantIds = [
        ...new Set(order.items.map((item) => item.variantId)),
      ].sort();
      await tx.$queryRaw`SELECT "id" FROM "product_variants" WHERE "id" IN (${Prisma.join(variantIds)}) ORDER BY "id" FOR UPDATE`;

      const warehouse = await tx.warehouse.findUnique({
        where: { code: DEFAULT_WAREHOUSE_CODE },
      });
      if (!warehouse) throw new Error('Default warehouse is missing');

      const [products, variants] = await Promise.all([
        tx.product.findMany({ where: { id: { in: productIds } } }),
        tx.productVariant.findMany({ where: { id: { in: variantIds } } }),
      ]);
      // Products created through the legacy v1 bridge can appear while the
      // online migration is running. Seed their balance once from legacy stock.
      for (const variant of variants) {
        await tx.inventoryBalance.upsert({
          where: {
            warehouseId_variantId: {
              warehouseId: warehouse.id,
              variantId: variant.id,
            },
          },
          create: {
            warehouseId: warehouse.id,
            variantId: variant.id,
            onHand: variant.stock,
          },
          update: {},
        });
      }
      await tx.$queryRaw`SELECT "variant_id" FROM "inventory_balances" WHERE "warehouse_id" = ${warehouse.id}::uuid AND "variant_id" IN (${Prisma.join(variantIds)}) ORDER BY "variant_id" FOR UPDATE`;
      const balances = await tx.inventoryBalance.findMany({
        where: { warehouseId: warehouse.id, variantId: { in: variantIds } },
      });
      const productsById = new Map(products.map((item) => [item.id, item]));
      const variantsById = new Map(variants.map((item) => [item.id, item]));
      const balancesByVariantId = new Map(
        balances.map((item) => [item.variantId, item]),
      );
      const unavailable = order.items.some((item) => {
        const product = productsById.get(item.productId);
        const variant = variantsById.get(item.variantId);
        const balance = balancesByVariantId.get(item.variantId);
        return (
          !product ||
          !variant ||
          product.deletedAt !== null ||
          variant.deletedAt !== null ||
          !product.isActive ||
          !variant.isActive ||
          product.status !== 'ACTIVE' ||
          variant.status !== 'ACTIVE' ||
          variant.productId !== item.productId ||
          !balance ||
          Math.min(
            product.stock,
            variant.stock,
            balance.onHand - balance.reserved,
          ) < item.quantity
        );
      });
      if (unavailable) {
        await this.failReservation(tx, order.id, 'INSUFFICIENT_STOCK');
        return 'FAILED';
      }

      const coupon = order.couponId
        ? await this.lockCoupon(tx, order.couponId)
        : null;
      if (
        order.couponId &&
        !this.isCouponValid(coupon, order.subtotal.toNumber())
      ) {
        await this.failReservation(tx, order.id, 'COUPON_INVALID');
        return 'FAILED';
      }

      const quantitiesByVariant = this.quantitiesByVariant(order.items);
      for (const [variantId, quantity] of quantitiesByVariant) {
        const reservationId = generateUuidV7();
        await tx.inventoryBalance.update({
          where: {
            warehouseId_variantId: {
              warehouseId: warehouse.id,
              variantId,
            },
          },
          data: { reserved: { increment: quantity } },
        });
        await tx.inventoryReservation.create({
          data: {
            id: reservationId,
            orderId: order.id,
            warehouseId: warehouse.id,
            variantId,
            quantity,
            status: 'RESERVED',
            expiresAt: order.reservationExpiresAt,
            idempotencyKey: `order-reservation:${order.id}:${variantId}`,
          },
        });
        await tx.inventoryMovement.create({
          data: {
            id: generateUuidV7(),
            eventId: `order-reservation:${order.id}:${variantId}`,
            warehouseId: warehouse.id,
            variantId,
            reservationId,
            orderId: order.id,
            type: 'RESERVATION',
            quantity,
            note: 'Order stock reservation',
          },
        });
        const productId = variantsById.get(variantId)!.productId;
        // v1 is retained only as an online migration bridge. These columns are
        // mirrors; InventoryBalance remains the authority for v2.
        await tx.productVariant.update({
          where: { id: variantId },
          data: { stock: { decrement: quantity } },
        });
        await tx.product.update({
          where: { id: productId },
          data: { stock: { decrement: quantity } },
        });
      }
      if (coupon) {
        await tx.couponUsage.create({
          data: {
            id: generateUuidV7(),
            couponId: coupon.id,
            userId: order.userId,
            orderId: order.id,
          },
        });
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      await tx.order.update({
        where: { id: order.id },
        data: { reservationStatus: ReservationStatusEnum.RESERVED },
      });
      await this.cleanCapturedCart(tx, payload);
      await this.enqueue(tx, {
        aggregateId: order.id,
        eventType: CommerceEventType.ORDER_RESERVED,
        payload: { orderId: order.id },
      });
      await this.enqueueProjectionRefreshes(tx, productIds);
      return 'RESERVED';
    });
  }

  async releaseOrder(
    payload: OrderReleaseRequestedPayload,
  ): Promise<'RELEASED' | 'IGNORED'> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "orders" WHERE "id" = ${payload.orderId}::uuid FOR UPDATE`;
      const order = await tx.order.findFirst({
        where: { id: payload.orderId, deletedAt: null },
        include: { items: true, couponUsages: true },
      });
      if (
        !order ||
        order.reservationStatus === ReservationStatusEnum.RELEASED ||
        order.reservationStatus === ReservationStatusEnum.FAILED
      ) {
        return 'IGNORED';
      }
      if (order.reservationStatus !== ReservationStatusEnum.RELEASE_PENDING) {
        return 'IGNORED';
      }

      const reservations = await tx.inventoryReservation.findMany({
        where: { orderId: order.id, status: 'RESERVED' },
        include: { variant: { select: { productId: true } } },
      });
      const variantIds = reservations.map((item) => item.variantId).sort();
      if (variantIds.length > 0) {
        await tx.$queryRaw`SELECT "variant_id" FROM "inventory_balances" WHERE "warehouse_id" IN (${Prisma.join([...new Set(reservations.map((item) => item.warehouseId))].sort())}) AND "variant_id" IN (${Prisma.join(variantIds)}) ORDER BY "warehouse_id", "variant_id" FOR UPDATE`;
      }
      for (const reservation of reservations) {
        await tx.inventoryBalance.update({
          where: {
            warehouseId_variantId: {
              warehouseId: reservation.warehouseId,
              variantId: reservation.variantId,
            },
          },
          data: { reserved: { decrement: reservation.quantity } },
        });
        await tx.inventoryReservation.update({
          where: { id: reservation.id },
          data: {
            status: 'RELEASED',
            releasedAt: new Date(),
          },
        });
        await tx.inventoryMovement.create({
          data: {
            id: generateUuidV7(),
            eventId: `order-release:${order.id}:${reservation.variantId}`,
            warehouseId: reservation.warehouseId,
            variantId: reservation.variantId,
            reservationId: reservation.id,
            orderId: order.id,
            type: 'RELEASE',
            quantity: -reservation.quantity,
            note: `Order reservation release: ${payload.reason}`,
          },
        });
        await tx.productVariant.update({
          where: { id: reservation.variantId },
          data: { stock: { increment: reservation.quantity } },
        });
        await tx.product.update({
          where: { id: reservation.variant.productId },
          data: { stock: { increment: reservation.quantity } },
        });
      }
      for (const usage of order.couponUsages) {
        await tx.coupon.updateMany({
          where: { id: usage.couponId, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
        await tx.couponUsage.delete({ where: { id: usage.id } });
      }
      await tx.order.update({
        where: { id: order.id },
        data: { reservationStatus: ReservationStatusEnum.RELEASED },
      });
      await this.enqueue(tx, {
        aggregateId: order.id,
        eventType: CommerceEventType.ORDER_RELEASED,
        payload: { orderId: order.id, reason: payload.reason },
      });
      await this.enqueueProjectionRefreshes(tx, [
        ...new Set(reservations.map((item) => item.variant.productId)),
      ]);
      return 'RELEASED';
    });
  }

  async enqueueExpiredOrders(now = new Date(), limit = 100): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const due = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "orders"
        WHERE "deleted_at" IS NULL
          AND "status" <> 'CANCELLED'
          AND "payment_method" = 'MOMO'
          AND "payment_status" = 'PENDING'
          AND "reservation_expires_at" <= ${now}
          AND "reservation_status" IN ('PENDING', 'RESERVED')
        ORDER BY "reservation_expires_at"
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `;
      for (const item of due) {
        const current = await tx.order.findUniqueOrThrow({
          where: { id: item.id },
          select: { reservationStatus: true },
        });
        const needsRelease =
          current.reservationStatus === ReservationStatusEnum.RESERVED;
        await tx.order.update({
          where: { id: item.id },
          data: {
            status: OrderStatusEnum.CANCELLED,
            reservationStatus: needsRelease
              ? ReservationStatusEnum.RELEASE_PENDING
              : ReservationStatusEnum.RELEASED,
            cancellationReason: 'PAYMENT_EXPIRED',
          },
        });
        if (needsRelease) {
          await this.enqueue(tx, {
            aggregateId: item.id,
            eventType: CommerceEventType.ORDER_RELEASE_REQUESTED,
            payload: { orderId: item.id, reason: 'PAYMENT_EXPIRED' },
          });
        }
      }
      return due.length;
    });
  }

  private async failReservation(
    tx: Prisma.TransactionClient,
    orderId: string,
    reason: string,
  ): Promise<void> {
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatusEnum.CANCELLED,
        reservationStatus: ReservationStatusEnum.FAILED,
        cancellationReason: reason,
      },
    });
    await this.enqueue(tx, {
      aggregateId: orderId,
      eventType: CommerceEventType.ORDER_RESERVATION_FAILED,
      payload: { orderId, reason },
    });
  }

  private async lockCoupon(tx: Prisma.TransactionClient, couponId: string) {
    await tx.$queryRaw`SELECT "id" FROM "coupons" WHERE "id" = ${couponId}::uuid FOR UPDATE`;
    return tx.coupon.findFirst({
      where: { id: couponId, deletedAt: null },
    });
  }

  private isCouponValid(
    coupon: Awaited<
      ReturnType<Prisma.TransactionClient['coupon']['findFirst']>
    >,
    subtotal: number,
  ): boolean {
    if (!coupon || !coupon.isActive) return false;
    if (coupon.expiresAt && coupon.expiresAt <= new Date()) return false;
    if (coupon.maxUsage !== null && coupon.usedCount >= coupon.maxUsage) {
      return false;
    }
    if (
      coupon.minOrderAmount !== null &&
      subtotal < coupon.minOrderAmount.toNumber()
    ) {
      return false;
    }
    const discountValue = coupon.discountValue.toNumber();
    if (
      coupon.discountType === DiscountTypeEnum.PERCENTAGE &&
      (discountValue <= 0 || discountValue > 100)
    ) {
      return false;
    }
    return discountValue > 0;
  }

  private async cleanCapturedCart(
    tx: Prisma.TransactionClient,
    payload: OrderSubmittedPayload,
  ): Promise<void> {
    if (!payload.cartId || payload.cartItemIds.length === 0) return;
    const cart = await tx.cart.findUnique({
      where: { id: payload.cartId },
      select: { updatedAt: true },
    });
    if (!cart) return;
    await tx.cartItem.deleteMany({
      where: {
        cartId: payload.cartId,
        id: { in: payload.cartItemIds },
      },
    });
    await tx.cart.updateMany({
      where: { id: payload.cartId },
      data: {
        updatedAt: new Date(Math.max(Date.now(), cart.updatedAt.getTime() + 1)),
        ...(payload.couponId ? { couponId: null } : {}),
      },
    });
  }

  private async enqueue(
    tx: Prisma.TransactionClient,
    input: {
      aggregateId: string;
      aggregateType?: string;
      eventType: string;
      payload: Prisma.InputJsonValue;
    },
  ): Promise<void> {
    await tx.outboxMessage.create({
      data: {
        id: generateUuidV7(),
        aggregateType: input.aggregateType ?? 'Order',
        aggregateId: input.aggregateId,
        eventType: input.eventType,
        payload: input.payload,
      },
    });
  }

  private quantitiesByVariant(
    items: ReadonlyArray<{ variantId: string; quantity: number }>,
  ): Map<string, number> {
    const quantities = new Map<string, number>();
    for (const item of items) {
      quantities.set(
        item.variantId,
        (quantities.get(item.variantId) ?? 0) + item.quantity,
      );
    }
    return quantities;
  }

  private async enqueueProjectionRefreshes(
    tx: Prisma.TransactionClient,
    productIds: string[],
  ): Promise<void> {
    for (const productId of [...new Set(productIds)].sort()) {
      await this.enqueue(tx, {
        aggregateType: 'Product',
        aggregateId: productId,
        eventType: CommerceEventType.CATALOG_PROJECTION_REFRESH_REQUESTED,
        payload: { productId },
      });
    }
  }

  async refreshCatalogProjection(productId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        include: {
          media: {
            orderBy: [
              { isPrimary: 'desc' },
              { sortOrder: 'asc' },
              { id: 'asc' },
            ],
            take: 1,
          },
          variants: {
            where: { deletedAt: null, status: 'ACTIVE' },
            include: {
              inventoryBalances: {
                where: { warehouse: { code: DEFAULT_WAREHOUSE_CODE } },
                select: { onHand: true, reserved: true },
              },
            },
          },
        },
      });
      if (!product) return;
      const prices = product.variants.map((item) => item.price);
      const availableQuantity = product.variants.reduce(
        (total, variant) =>
          total +
          variant.inventoryBalances.reduce(
            (sum, balance) =>
              sum + Math.max(0, balance.onHand - balance.reserved),
            0,
          ),
        0,
      );
      await tx.productCatalogProjection.upsert({
        where: { productId },
        create: {
          productId,
          categoryId: product.categoryId,
          status: product.status,
          publishedAt: product.publishedAt ?? product.createdAt,
          priceMin:
            prices.length > 0
              ? prices.reduce((min, value) =>
                  value.lessThan(min) ? value : min,
                )
              : 0,
          priceMax:
            prices.length > 0
              ? prices.reduce((max, value) =>
                  value.greaterThan(max) ? value : max,
                )
              : 0,
          availableQuantity,
          sellableVariantCount: product.variants.length,
          primaryMediaUrl: product.media[0]?.url ?? null,
          searchText: `${product.name} ${product.slug}`.toLowerCase(),
        },
        update: {
          categoryId: product.categoryId,
          status: product.status,
          publishedAt: product.publishedAt ?? product.createdAt,
          priceMin:
            prices.length > 0
              ? prices.reduce((min, value) =>
                  value.lessThan(min) ? value : min,
                )
              : 0,
          priceMax:
            prices.length > 0
              ? prices.reduce((max, value) =>
                  value.greaterThan(max) ? value : max,
                )
              : 0,
          availableQuantity,
          sellableVariantCount: product.variants.length,
          primaryMediaUrl: product.media[0]?.url ?? null,
          searchText: `${product.name} ${product.slug}`.toLowerCase(),
          version: { increment: 1 },
        },
      });
    });
  }
}
