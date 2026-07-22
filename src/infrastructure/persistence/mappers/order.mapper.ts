import type {
  Order as PrismaOrder,
  OrderItem as PrismaOrderItem,
  User as PrismaUser,
} from '@/generated/prisma/client';
import { Order, ShippingAddress } from '@/domain/entities/order';
import { OrderItemSnapshot } from '@/domain/entities/order-item';
import { OrderFactory } from '@/domain/factories/order.factory';
import { OrderItemFactory } from '@/domain/factories/order-item.factory';
import { OrderStatusEnum } from '@/domain/enums/order-status.enum';
import { PaymentStatusEnum } from '@/domain/enums/payment-status.enum';
import { PaymentMethodEnum } from '@/domain/enums/payment-method.enum';

export type PrismaOrderWithRelations = PrismaOrder & {
  items: PrismaOrderItem[];
  user?: Pick<PrismaUser, 'id' | 'email' | 'firstName' | 'lastName'>;
};

export class OrderMapper {
  static toDomain(raw: PrismaOrderWithRelations): Order {
    return OrderFactory.reconstitute({
      id: raw.id,
      userId: raw.userId,
      status: raw.status as OrderStatusEnum,
      subtotal: raw.subtotal.toNumber(),
      discountAmount: raw.discountAmount.toNumber(),
      total: raw.total.toNumber(),
      paymentMethod: raw.paymentMethod as PaymentMethodEnum,
      paymentStatus: raw.paymentStatus as PaymentStatusEnum,
      shippingAddress: raw.shippingAddress as unknown as ShippingAddress,
      couponId: raw.couponId,
      note: raw.note,
      items: raw.items.map((item) =>
        OrderItemFactory.create({
          id: item.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toNumber(),
          totalPrice: item.totalPrice.toNumber(),
          snapshot: item.snapshot as unknown as OrderItemSnapshot,
        }),
      ),
      ...(raw.user
        ? {
            customer: {
              id: raw.user.id,
              email: raw.user.email,
              firstName: raw.user.firstName,
              lastName: raw.user.lastName,
            },
          }
        : {}),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
    });
  }
}
