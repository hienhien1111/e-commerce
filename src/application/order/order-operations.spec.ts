import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CancelOrderHandler } from '@/application/order/commands/cancel-order/cancel-order.handler';
import { PlaceOrderHandler } from '@/application/order/commands/place-order/place-order.handler';
import { UpdateOrderStatusHandler } from '@/application/order/commands/update-order-status/update-order-status.handler';
import { GetAdminOrderHandler } from '@/application/order/queries/get-admin-order/get-admin-order.handler';
import { GetAdminOrdersHandler } from '@/application/order/queries/get-admin-orders/get-admin-orders.handler';
import { GetOrderStatsHandler } from '@/application/order/queries/get-order-stats/get-order-stats.handler';
import { GetOrderHandler } from '@/application/order/queries/get-order/get-order.handler';
import { GetOrdersHandler } from '@/application/order/queries/get-orders/get-orders.handler';
import { OrderStatusEnum } from '@/domain/enums/order-status.enum';
import { PaymentStatusEnum } from '@/domain/enums/payment-status.enum';
import { OrderItemFactory } from '@/domain/factories/order-item.factory';
import { OrderFactory } from '@/domain/factories/order.factory';

const shippingAddress = {
  fullName: 'Tester',
  phone: '0900000000',
  addressLine: '1 Main',
  ward: 'Ward',
  district: 'District',
  city: 'City',
};

const order = (overrides: Record<string, unknown> = {}) =>
  OrderFactory.create({
    id: 'order-1',
    userId: 'user-1',
    status: OrderStatusEnum.PENDING,
    subtotal: 100_000,
    discountAmount: 10_000,
    total: 90_000,
    paymentStatus: PaymentStatusEnum.PENDING,
    shippingAddress,
    couponId: 'coupon-1',
    note: null,
    items: [
      OrderItemFactory.create({
        id: 'item-1',
        productId: 'product-1',
        quantity: 1,
        unitPrice: 100_000,
        totalPrice: 100_000,
        snapshot: { name: 'Product', sku: 'SKU-1', imageUrl: null },
      }),
    ],
    ...overrides,
  } as never);

describe('Order application operations', () => {
  it('checks out a cart with its shipping snapshot and publishes only after success', async () => {
    const created = order();
    const checkout = { checkout: jest.fn().mockResolvedValue(created) };
    const events = { publish: jest.fn() };
    const handler = new PlaceOrderHandler(checkout as never, events as never);
    const command = { userId: 'user-1', shippingAddress };

    await expect(handler.execute(command as never)).resolves.toBe(created);
    expect(checkout.checkout).toHaveBeenCalledWith(command);
    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({ order: created }),
    );

    checkout.checkout.mockRejectedValueOnce(new Error('stock conflict'));
    await expect(handler.execute(command as never)).rejects.toThrow(
      'stock conflict',
    );
    expect(events.publish).toHaveBeenCalledTimes(1);
  });

  it('enforces cancellation ownership and sends the correct processing privilege to the transaction port', async () => {
    const existing = order();
    const cancelled = order({ status: OrderStatusEnum.CANCELLED });
    const orders = { findById: jest.fn().mockResolvedValue(existing) };
    const cancellation = { cancel: jest.fn().mockResolvedValue(cancelled) };
    const events = { publish: jest.fn() };
    const handler = new CancelOrderHandler(
      orders as never,
      cancellation as never,
      events as never,
    );

    await expect(
      handler.execute({ orderId: 'order-1', userId: 'other', isAdmin: false }),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      handler.execute({ orderId: 'order-1', userId: 'user-1', isAdmin: false }),
    ).resolves.toBe(cancelled);
    expect(cancellation.cancel).toHaveBeenLastCalledWith({
      orderId: 'order-1',
      allowProcessing: false,
    });
    await handler.execute({
      orderId: 'order-1',
      userId: 'admin',
      isAdmin: true,
    });
    expect(cancellation.cancel).toHaveBeenLastCalledWith({
      orderId: 'order-1',
      allowProcessing: true,
    });
    expect(events.publish).toHaveBeenCalledTimes(2);

    orders.findById.mockResolvedValueOnce(null);
    await expect(
      handler.execute({ orderId: 'missing', userId: 'user-1', isAdmin: false }),
    ).rejects.toThrow(NotFoundException);
  });

  it('allows only handler-managed status transitions and saves a valid next status', async () => {
    const existing = order();
    const orders = {
      findById: jest.fn().mockResolvedValue(existing),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const handler = new UpdateOrderStatusHandler(orders as never);

    await expect(
      handler.execute({
        orderId: 'order-1',
        status: OrderStatusEnum.CONFIRMED,
      }),
    ).resolves.toMatchObject({ status: OrderStatusEnum.CONFIRMED });
    expect(orders.save).toHaveBeenCalledWith(existing);
    await expect(
      handler.execute({
        orderId: 'order-1',
        status: OrderStatusEnum.CANCELLED,
      }),
    ).rejects.toThrow(UnprocessableEntityException);
    await expect(
      handler.execute({
        orderId: 'order-1',
        status: OrderStatusEnum.DELIVERED,
      }),
    ).rejects.toThrow(UnprocessableEntityException);

    orders.findById.mockResolvedValueOnce(null);
    await expect(
      handler.execute({
        orderId: 'missing',
        status: OrderStatusEnum.CONFIRMED,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('enforces customer ownership for detail reads while allowing admin access', async () => {
    const existing = order();
    const orders = { findById: jest.fn().mockResolvedValue(existing) };
    const handler = new GetOrderHandler(orders as never);

    await expect(
      handler.execute({ orderId: 'order-1', userId: 'other', isAdmin: false }),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      handler.execute({ orderId: 'order-1', userId: 'user-1', isAdmin: false }),
    ).resolves.toBe(existing);
    await expect(
      handler.execute({ orderId: 'order-1', userId: 'admin', isAdmin: true }),
    ).resolves.toBe(existing);

    orders.findById.mockResolvedValueOnce(null);
    await expect(
      handler.execute({ orderId: 'missing', userId: 'user-1', isAdmin: false }),
    ).rejects.toThrow(NotFoundException);
  });

  it('forwards customer and admin filters, cursors, and date ranges unchanged', async () => {
    const page = { data: [order()], nextCursor: 'next' };
    const stats = { counts: {}, totalRevenue: 90_000 };
    const filters = {
      status: OrderStatusEnum.PENDING,
      cursor: 'cursor',
      limit: 10,
    };
    const adminFilters = {
      ...filters,
      userId: 'user-1',
      from: new Date('2026-01-01'),
      to: new Date('2026-01-31'),
    };
    const orders = {
      findPageForUser: jest.fn().mockResolvedValue(page),
      findAdminPage: jest.fn().mockResolvedValue(page),
      getStats: jest.fn().mockResolvedValue(stats),
      findById: jest.fn().mockResolvedValue(order()),
    };

    await expect(
      new GetOrdersHandler(orders as never).execute({
        userId: 'user-1',
        filters,
      }),
    ).resolves.toBe(page);
    expect(orders.findPageForUser).toHaveBeenCalledWith('user-1', filters);
    await expect(
      new GetAdminOrdersHandler(orders as never).execute({
        filters: adminFilters,
      }),
    ).resolves.toBe(page);
    expect(orders.findAdminPage).toHaveBeenCalledWith(adminFilters);
    await expect(
      new GetOrderStatsHandler(orders as never).execute({
        from: adminFilters.from,
        to: adminFilters.to,
      }),
    ).resolves.toBe(stats);
    expect(orders.getStats).toHaveBeenCalledWith({
      from: adminFilters.from,
      to: adminFilters.to,
    });
  });

  it('returns admin detail and reports a missing order', async () => {
    const existing = order();
    const orders = { findById: jest.fn().mockResolvedValue(existing) };
    const handler = new GetAdminOrderHandler(orders as never);

    await expect(handler.execute({ orderId: 'order-1' })).resolves.toBe(
      existing,
    );
    orders.findById.mockResolvedValueOnce(null);
    await expect(handler.execute({ orderId: 'missing' })).rejects.toThrow(
      NotFoundException,
    );
  });
});
