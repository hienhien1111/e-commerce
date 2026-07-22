import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { GetAdminDashboardStatsHandler } from '@/application/admin/queries/get-admin-dashboard-stats/get-admin-dashboard-stats.handler';
import { CancelOrderHandler } from '@/application/order/commands/cancel-order/cancel-order.handler';
import { PlaceBuyNowOrderHandler } from '@/application/order/commands/place-buy-now-order/place-buy-now-order.handler';
import { PlaceOrderHandler } from '@/application/order/commands/place-order/place-order.handler';
import { UpdateOrderStatusHandler } from '@/application/order/commands/update-order-status/update-order-status.handler';
import { GetAdminOrderHandler } from '@/application/order/queries/get-admin-order/get-admin-order.handler';
import { GetAdminOrdersHandler } from '@/application/order/queries/get-admin-orders/get-admin-orders.handler';
import { GetOrderStatsHandler } from '@/application/order/queries/get-order-stats/get-order-stats.handler';
import { GetOrderHandler } from '@/application/order/queries/get-order/get-order.handler';
import { GetOrdersHandler } from '@/application/order/queries/get-orders/get-orders.handler';
import { OrderStatusEnum } from '@/domain/enums/order-status.enum';
import { PaymentMethodEnum } from '@/domain/enums/payment-method.enum';
import { PaymentStatusEnum } from '@/domain/enums/payment-status.enum';
import { OrderItemFactory } from '@/domain/factories/order-item.factory';
import { OrderFactory } from '@/domain/factories/order.factory';

const order = (overrides: Partial<Record<string, unknown>> = {}) =>
  OrderFactory.create({
    id: 'order-1',
    userId: 'user-1',
    status: OrderStatusEnum.PENDING,
    subtotal: 100_000,
    discountAmount: 0,
    total: 100_000,
    paymentMethod: PaymentMethodEnum.COD,
    paymentStatus: PaymentStatusEnum.PENDING,
    shippingAddress: {
      fullName: 'Tester',
      phone: '0900000000',
      addressLine: '1 Main',
      ward: 'Ward',
      district: 'District',
      city: 'City',
    },
    couponId: null,
    note: null,
    items: [
      OrderItemFactory.create({
        productId: 'product-1',
        quantity: 1,
        unitPrice: 100_000,
        totalPrice: 100_000,
        snapshot: { name: 'Product', sku: null, imageUrl: null },
      }),
    ],
    ...overrides,
  } as never);

describe('Order application operations', () => {
  it('checks ownership before cancellation and publishes the cancellation event', async () => {
    const existing = order();
    const orders = { findById: jest.fn().mockResolvedValue(existing) };
    const cancellation = { cancel: jest.fn().mockResolvedValue(existing) };
    const events = { publish: jest.fn() };
    const handler = new CancelOrderHandler(
      orders as never,
      cancellation as never,
      events as never,
    );

    await expect(
      handler.execute({
        orderId: existing.id,
        userId: 'other',
        isAdmin: false,
      }),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      handler.execute({
        orderId: existing.id,
        userId: existing.userId,
        isAdmin: false,
      }),
    ).resolves.toBe(existing);
    expect(cancellation.cancel).toHaveBeenCalledWith({
      orderId: existing.id,
      allowProcessing: false,
    });
    expect(events.publish).toHaveBeenCalledTimes(1);
  });

  it('checks out cart and buy-now orders then publishes their placed events', async () => {
    const created = order();
    const checkout = {
      checkout: jest.fn().mockResolvedValue(created),
      checkoutBuyNow: jest.fn().mockResolvedValue(created),
    };
    const events = { publish: jest.fn() };
    const cartHandler = new PlaceOrderHandler(
      checkout as never,
      events as never,
    );
    const buyNowHandler = new PlaceBuyNowOrderHandler(
      checkout as never,
      events as never,
    );

    await expect(
      cartHandler.execute({ userId: 'user-1' } as never),
    ).resolves.toBe(created);
    await expect(
      buyNowHandler.execute({
        userId: 'user-1',
        productId: 'product-1',
      } as never),
    ).resolves.toBe(created);
    expect(events.publish).toHaveBeenCalledTimes(2);
  });

  it('updates only allowed order transitions', async () => {
    const existing = order();
    const orders = {
      findById: jest.fn().mockResolvedValue(existing),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const handler = new UpdateOrderStatusHandler(orders as never);

    await expect(
      handler.execute({
        orderId: existing.id,
        status: OrderStatusEnum.CONFIRMED,
      }),
    ).resolves.toMatchObject({ status: OrderStatusEnum.CONFIRMED });
    await expect(
      handler.execute({
        orderId: existing.id,
        status: OrderStatusEnum.CANCELLED,
      }),
    ).rejects.toThrow(UnprocessableEntityException);
    await expect(
      handler.execute({
        orderId: existing.id,
        status: OrderStatusEnum.DELIVERED,
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('enforces ownership for customer order reads and exposes admin reads', async () => {
    const existing = order();
    const orders = {
      findById: jest.fn().mockResolvedValue(existing),
      findPageForUser: jest.fn().mockResolvedValue({ data: [existing] }),
      findAdminPage: jest.fn().mockResolvedValue({ data: [existing] }),
      getStats: jest.fn().mockResolvedValue({ totalOrders: 1 }),
    };

    await expect(
      new GetOrderHandler(orders as never).execute({
        orderId: existing.id,
        userId: 'other',
        isAdmin: false,
      }),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      new GetOrderHandler(orders as never).execute({
        orderId: existing.id,
        userId: 'admin',
        isAdmin: true,
      }),
    ).resolves.toBe(existing);
    await expect(
      new GetAdminOrderHandler(orders as never).execute({
        orderId: existing.id,
      }),
    ).resolves.toBe(existing);
    await expect(
      new GetOrdersHandler(orders as never).execute({
        userId: 'user-1',
        filters: {},
      }),
    ).resolves.toEqual({ data: [existing] });
    await expect(
      new GetAdminOrdersHandler(orders as never).execute({ filters: {} }),
    ).resolves.toEqual({ data: [existing] });
    await expect(
      new GetOrderStatsHandler(orders as never).execute({}),
    ).resolves.toEqual({ totalOrders: 1 });
    orders.findById.mockResolvedValueOnce(null);
    await expect(
      new GetAdminOrderHandler(orders as never).execute({ orderId: 'missing' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('delegates dashboard statistics to the admin dashboard port', async () => {
    const dashboard = {
      getDashboardStats: jest.fn().mockResolvedValue({ totalUsers: 2 }),
    };
    await expect(
      new GetAdminDashboardStatsHandler(dashboard as never).execute(),
    ).resolves.toEqual({ totalUsers: 2 });
  });
});
