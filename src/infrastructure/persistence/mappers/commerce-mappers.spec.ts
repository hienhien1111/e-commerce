import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  ReservationStatus,
} from '@/generated/prisma/client';
import { CartFactory } from '@/domain/factories/cart.factory';
import { CartItemFactory } from '@/domain/factories/cart-item.factory';
import { CartMapper } from './cart.mapper';
import { OrderMapper, PrismaOrderWithRelations } from './order.mapper';
import { PaymentMapper } from './payment.mapper';

const now = new Date('2026-07-23T08:00:00.000Z');

describe('commerce persistence mappers', () => {
  it('round-trips cart variants and preserves transient item IDs', () => {
    const cart = CartFactory.reconstitute({
      id: 'cart-1',
      userId: 'user-1',
      couponId: 'coupon-1',
      items: [
        CartItemFactory.reconstitute({
          id: 'item-1',
          productId: 'product-1',
          variantId: 'variant-red',
          quantity: 2,
          createdAt: now,
          updatedAt: now,
        }),
        CartItemFactory.reconstitute({
          id: 'item-2',
          productId: 'product-1',
          variantId: 'variant-blue',
          quantity: 1,
          createdAt: now,
          updatedAt: now,
        }),
      ],
      createdAt: now,
      updatedAt: now,
    });

    const persistence = CartMapper.toPersistence(cart);
    const itemCreates = persistence.items?.create as Array<{
      id: string;
      variantId: string;
    }>;
    expect(itemCreates.map((item) => item.variantId)).toEqual([
      'variant-red',
      'variant-blue',
    ]);
    expect(itemCreates.map((item) => item.id)).toEqual(['item-1', 'item-2']);
  });

  it('maps every order reservation/payment timestamp in both directions', () => {
    const raw = {
      id: 'order-1',
      userId: 'user-1',
      status: OrderStatus.CANCELLED,
      reservationStatus: ReservationStatus.RELEASED,
      reservationExpiresAt: now,
      cancellationReason: 'PAYMENT_EXPIRED',
      subtotal: new Prisma.Decimal(100_000),
      discountAmount: new Prisma.Decimal(10_000),
      total: new Prisma.Decimal(90_000),
      paymentMethod: PaymentMethod.MOMO,
      paymentStatus: PaymentStatus.REFUNDED,
      paidAt: now,
      shippingAddress: {
        fullName: 'Tester',
        phone: '0900000000',
        addressLine: '1 Main',
        ward: 'Ward',
        district: 'District',
        city: 'City',
      },
      couponId: 'coupon-1',
      note: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      items: [
        {
          id: 'item-1',
          orderId: 'order-1',
          productId: 'product-1',
          variantId: 'variant-1',
          quantity: 1,
          unitPrice: new Prisma.Decimal(100_000),
          totalPrice: new Prisma.Decimal(100_000),
          snapshot: {
            name: 'Product',
            sku: 'SKU-1',
            imageUrl: null,
            variantLabel: 'Red',
          },
        },
      ],
    } as PrismaOrderWithRelations;

    const domain = OrderMapper.toDomain(raw);
    const persistence = OrderMapper.toPersistence(domain);
    expect(persistence).toMatchObject({
      reservationStatus: ReservationStatus.RELEASED,
      reservationExpiresAt: now,
      cancellationReason: 'PAYMENT_EXPIRED',
      paymentStatus: PaymentStatus.REFUNDED,
      paidAt: now,
    });
  });

  it('round-trips payment retry metadata and refund states', () => {
    const raw = {
      id: 'payment-1',
      orderId: 'order-1',
      provider: 'momo',
      amount: new Prisma.Decimal(90_000),
      currency: 'VND',
      status: PaymentStatus.REFUND_PENDING,
      providerOrderId: 'momo-order-1',
      providerTransId: 'transaction-1',
      payUrl: null,
      qrCodeUrl: null,
      deeplink: null,
      metadata: {
        attempts: [
          {
            attempt: 1,
            providerOrderId: 'momo-order-1',
            requestId: 'request-1',
            startedAt: now.toISOString(),
            phase: 'READY',
          },
        ],
      },
      expiresAt: now,
      paidAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const domain = PaymentMapper.toDomain(raw);
    expect(PaymentMapper.toPersistence(domain)).toMatchObject({
      id: raw.id,
      orderId: raw.orderId,
      status: PaymentStatus.REFUND_PENDING,
      providerTransId: 'transaction-1',
      expiresAt: now,
      paidAt: now,
      metadata: raw.metadata,
    });
  });
});
