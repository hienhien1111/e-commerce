import { Injectable } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import type { OrderCheckoutPort } from '@/application/order/ports/order-checkout.port';
import type { OrderCancellationPort } from '@/application/order/ports/order-cancellation.port';
import { ApplicationError } from '@/application/shared/errors/application.error';
import { Order, ShippingAddress } from '@/domain/entities/order';
import { DiscountTypeEnum } from '@/domain/enums/discount-type.enum';
import { OrderStatusEnum } from '@/domain/enums/order-status.enum';
import { PaymentMethodEnum } from '@/domain/enums/payment-method.enum';
import { PaymentStatusEnum } from '@/domain/enums/payment-status.enum';
import { ReservationStatusEnum } from '@/domain/enums/reservation-status.enum';
import {
  OrderMapper,
  PrismaOrderWithRelations,
} from '@/infrastructure/persistence/mappers/order.mapper';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { generateUuidV7 } from '@/utils/uuid-v7';

const ORDER_INCLUDE = {
  items: { orderBy: { id: 'asc' } },
  user: { select: { id: true, email: true, firstName: true, lastName: true } },
} as const satisfies Prisma.OrderInclude;

@Injectable()
export class PrismaOrderWorkflowAdapter
  implements OrderCheckoutPort, OrderCancellationPort
{
  constructor(private readonly prisma: PrismaService) {}

  async checkout(input: {
    userId: string;
    shippingAddress: ShippingAddress;
    paymentMethod: PaymentMethodEnum;
  }): Promise<Order> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "carts" WHERE "user_id" = ${input.userId}::uuid FOR UPDATE`;
      const cart = await tx.cart.findUnique({
        where: { userId: input.userId },
        include: { items: { orderBy: { id: 'asc' } } },
      });
      if (!cart || cart.items.length === 0) {
        throw new ApplicationError(
          'CART_EMPTY',
          'Cart is empty',
          'UNPROCESSABLE',
        );
      }
      return this.submit(tx, {
        userId: input.userId,
        lines: cart.items,
        cartId: cart.id,
        couponId: cart.couponId,
        shippingAddress: input.shippingAddress,
        paymentMethod: input.paymentMethod,
      });
    });
  }

  async checkoutBuyNow(input: {
    userId: string;
    productId?: string;
    variantId?: string;
    quantity: number;
    couponCode?: string;
    shippingAddress: ShippingAddress;
    paymentMethod: PaymentMethodEnum;
  }): Promise<Order> {
    return this.prisma.$transaction(async (tx) => {
      const variant = input.variantId
        ? await tx.productVariant.findFirst({
            where: { id: input.variantId, deletedAt: null },
          })
        : input.productId
          ? await tx.productVariant.findFirst({
              where: {
                productId: input.productId,
                OR: [{ combinationKey: 'DEFAULT' }, { label: null }],
                deletedAt: null,
              },
            })
          : null;
      if (!variant) {
        throw new ApplicationError(
          'VARIANT_REQUIRED',
          'Choose a product variant before checkout',
          'UNPROCESSABLE',
        );
      }
      return this.submit(tx, {
        userId: input.userId,
        lines: [
          {
            productId: variant.productId,
            variantId: variant.id,
            quantity: input.quantity,
          },
        ],
        couponCode: input.couponCode,
        shippingAddress: input.shippingAddress,
        paymentMethod: input.paymentMethod,
      });
    });
  }

  async cancel(input: {
    orderId: string;
    allowProcessing: boolean;
  }): Promise<Order> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "orders" WHERE "id" = ${input.orderId}::uuid FOR UPDATE`;
      const order = await tx.order.findFirst({
        where: { id: input.orderId, deletedAt: null },
      });
      if (!order) {
        throw new ApplicationError(
          'ORDER_NOT_FOUND',
          'Order no longer exists',
          'NOT_FOUND',
        );
      }
      const validStatus =
        order.status === OrderStatusEnum.PENDING ||
        order.status === OrderStatusEnum.CONFIRMED ||
        (input.allowProcessing && order.status === OrderStatusEnum.PROCESSING);
      if (
        !validStatus ||
        order.paymentStatus === PaymentStatusEnum.PAID ||
        order.paymentStatus === PaymentStatusEnum.REFUND_PENDING
      ) {
        throw new ApplicationError(
          'ORDER_CANNOT_CANCEL',
          'Order cannot be cancelled',
          'UNPROCESSABLE',
        );
      }
      const needsRelease =
        order.reservationStatus === ReservationStatusEnum.RESERVED;
      const cancelled = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatusEnum.CANCELLED,
          reservationStatus: needsRelease
            ? ReservationStatusEnum.RELEASE_PENDING
            : ReservationStatusEnum.RELEASED,
          cancellationReason: 'CANCELLED',
        },
        include: ORDER_INCLUDE,
      });
      if (needsRelease) {
        await tx.outboxMessage.create({
          data: {
            id: generateUuidV7(),
            aggregateType: 'Order',
            aggregateId: order.id,
            eventType: 'OrderReleaseRequested',
            payload: { orderId: order.id, reason: 'CANCELLED' },
          },
        });
      }
      return OrderMapper.toDomain(cancelled as PrismaOrderWithRelations);
    });
  }

  private async submit(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      lines: ReadonlyArray<{
        id?: string;
        productId: string;
        variantId: string;
        quantity: number;
      }>;
      cartId?: string;
      couponId?: string | null;
      couponCode?: string;
      shippingAddress: ShippingAddress;
      paymentMethod: PaymentMethodEnum;
    },
  ): Promise<Order> {
    const productIds = [...new Set(input.lines.map((item) => item.productId))];
    const variantIds = [...new Set(input.lines.map((item) => item.variantId))];
    const [products, variants] = await Promise.all([
      tx.product.findMany({
        where: { id: { in: productIds } },
        include: {
          images: {
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
            take: 1,
          },
        },
      }),
      tx.productVariant.findMany({
        where: { id: { in: variantIds } },
        include: {
          image: true,
          inventoryBalances: {
            where: { warehouse: { code: 'DEFAULT' } },
            select: { onHand: true, reserved: true },
          },
        },
      }),
    ]);
    const byId = new Map(products.map((product) => [product.id, product]));
    const variantsById = new Map(
      variants.map((variant) => [variant.id, variant]),
    );
    for (const item of input.lines) {
      const product = byId.get(item.productId);
      const variant = variantsById.get(item.variantId);
      if (
        !product ||
        !variant ||
        variant.productId !== item.productId ||
        product.deletedAt ||
        !product.isActive ||
        product.status !== 'ACTIVE' ||
        variant.deletedAt ||
        !variant.isActive ||
        variant.status !== 'ACTIVE' ||
        Math.min(
          product.stock,
          variant.stock,
          variant.inventoryBalances.length > 0
            ? variant.inventoryBalances.reduce(
                (sum, balance) =>
                  sum + Math.max(0, balance.onHand - balance.reserved),
                0,
              )
            : variant.stock,
        ) < item.quantity
      ) {
        throw new ApplicationError(
          'ORDER_ITEMS_UNAVAILABLE',
          'Order contains unavailable or insufficient-stock products',
          'UNPROCESSABLE',
        );
      }
    }
    const subtotal = input.lines.reduce(
      (sum, item) =>
        sum +
        variantsById.get(item.variantId)!.price.toNumber() * item.quantity,
      0,
    );
    const coupon = await this.lockCoupon(tx, input.couponId, input.couponCode);
    const discountAmount = coupon
      ? this.calculateDiscount(coupon, subtotal)
      : 0;
    const couponId = coupon?.id ?? null;
    const orderId = generateUuidV7();
    const reservationExpiresAt =
      input.paymentMethod === PaymentMethodEnum.MOMO
        ? new Date(
            Date.now() +
              Number(process.env.MOMO_PAYMENT_EXPIRY_MINUTES ?? 15) * 60_000,
          )
        : null;
    const created = await tx.order.create({
      data: {
        id: orderId,
        userId: input.userId,
        status: OrderStatusEnum.PENDING,
        reservationStatus: ReservationStatusEnum.PENDING,
        reservationExpiresAt,
        subtotal,
        discountAmount,
        total: subtotal - discountAmount,
        paymentMethod: input.paymentMethod,
        paymentStatus: PaymentStatusEnum.PENDING,
        shippingAddress:
          input.shippingAddress as unknown as Prisma.InputJsonValue,
        couponId,
        items: {
          create: input.lines.map((item) => {
            const product = byId.get(item.productId)!;
            const variant = variantsById.get(item.variantId)!;
            const unitPrice = variant.price.toNumber();
            return {
              id: generateUuidV7(),
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice,
              totalPrice: unitPrice * item.quantity,
              snapshot: {
                name: product.name,
                sku: variant.sku,
                imageUrl: variant.image?.url ?? product.images[0]?.url ?? null,
                variantLabel: variant.label,
              },
            };
          }),
        },
      },
      include: ORDER_INCLUDE,
    });
    await tx.outboxMessage.create({
      data: {
        id: generateUuidV7(),
        aggregateType: 'Order',
        aggregateId: orderId,
        eventType: 'OrderSubmitted',
        payload: {
          orderId,
          cartId: input.cartId ?? null,
          cartItemIds: input.cartId
            ? input.lines
                .map((item) => item.id)
                .filter((id): id is string => Boolean(id))
            : [],
          couponId,
        },
      },
    });
    return OrderMapper.toDomain(created as PrismaOrderWithRelations);
  }

  private async lockCoupon(
    tx: Prisma.TransactionClient,
    couponId: string | null | undefined,
    couponCode: string | undefined,
  ) {
    if (!couponId && !couponCode) return null;
    if (couponId) {
      await tx.$queryRaw`SELECT "id" FROM "coupons" WHERE "id" = ${couponId}::uuid FOR UPDATE`;
    } else {
      await tx.$queryRaw`SELECT "id" FROM "coupons" WHERE "code" = ${couponCode!} FOR UPDATE`;
    }
    const coupon = await tx.coupon.findFirst({
      where: {
        ...(couponId ? { id: couponId } : { code: couponCode! }),
        deletedAt: null,
      },
    });
    if (!coupon) {
      throw new ApplicationError(
        'COUPON_INVALID',
        'Applied coupon is no longer valid',
        'UNPROCESSABLE',
      );
    }
    return coupon;
  }

  private calculateDiscount(
    coupon: Awaited<
      ReturnType<Prisma.TransactionClient['coupon']['findFirst']>
    >,
    subtotal: number,
  ): number {
    if (!coupon) return 0;
    const invalid =
      !coupon.isActive ||
      (coupon.expiresAt !== null && coupon.expiresAt <= new Date()) ||
      (coupon.maxUsage !== null && coupon.usedCount >= coupon.maxUsage) ||
      (coupon.minOrderAmount !== null &&
        subtotal < coupon.minOrderAmount.toNumber());
    if (invalid) {
      throw new ApplicationError(
        'COUPON_INVALID',
        'Applied coupon is no longer valid',
        'UNPROCESSABLE',
      );
    }
    const value = coupon.discountValue.toNumber();
    return coupon.discountType === DiscountTypeEnum.FIXED_AMOUNT
      ? Math.min(value, subtotal)
      : Math.min(
          Math.floor((subtotal * value) / 100),
          coupon.maxDiscount?.toNumber() ?? Number.MAX_SAFE_INTEGER,
          subtotal,
        );
  }
}
