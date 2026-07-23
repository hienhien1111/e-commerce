import { OrderFactory } from '@/domain/factories/order.factory';
import { OrderItemFactory } from '@/domain/factories/order-item.factory';
import { OrderStatusEnum } from '@/domain/enums/order-status.enum';
import { PaymentStatusEnum } from '@/domain/enums/payment-status.enum';
import { OrderCancelledEvent } from '@/domain/events/order-cancelled.event';
import { OrderPlacedEvent } from '@/domain/events/order-placed.event';

const createOrder = () =>
  OrderFactory.create({
    userId: 'user-1',
    status: OrderStatusEnum.PENDING,
    subtotal: 100000,
    discountAmount: 10000,
    total: 90000,
    paymentStatus: PaymentStatusEnum.PENDING,
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
    items: [
      OrderItemFactory.create({
        productId: 'product-1',
        quantity: 1,
        unitPrice: 100000,
        totalPrice: 100000,
        snapshot: { name: 'Product', sku: null, imageUrl: null },
      }),
    ],
  });

describe('Order', () => {
  it('allows only the next fulfillment transition', () => {
    const order = createOrder();
    order.transitionTo(OrderStatusEnum.CONFIRMED);
    order.transitionTo(OrderStatusEnum.PROCESSING);
    expect(order.status).toBe(OrderStatusEnum.PROCESSING);
    expect(() => order.transitionTo(OrderStatusEnum.DELIVERED)).toThrow(
      'Cannot transition',
    );
  });

  it('cancels pending and confirmed orders but never paid or shipped orders', () => {
    const pending = createOrder();
    pending.cancel(false);
    expect(pending.status).toBe(OrderStatusEnum.CANCELLED);

    const processing = createOrder();
    processing.transitionTo(OrderStatusEnum.CONFIRMED);
    processing.transitionTo(OrderStatusEnum.PROCESSING);
    expect(() => processing.cancel(false)).toThrow('cannot be cancelled');
    processing.cancel(true);
    expect(processing.status).toBe(OrderStatusEnum.CANCELLED);

    const paid = createOrder();
    (
      paid as unknown as { props: { paymentStatus: PaymentStatusEnum } }
    ).props.paymentStatus = PaymentStatusEnum.PAID;
    expect(() => paid.cancel(true)).toThrow('cannot be cancelled');
  });

  it('lets a payment callback confirm pending once without regressing later fulfillment', () => {
    const order = createOrder();
    expect(order.confirmFromPayment()).toBe(true);
    order.transitionTo(OrderStatusEnum.PROCESSING);
    expect(order.confirmFromPayment()).toBe(false);
    expect(order.status).toBe(OrderStatusEnum.PROCESSING);
  });

  it('emits placement and cancellation events only for their aggregate changes', () => {
    const order = createOrder();
    expect(order.pullDomainEvents()).toEqual([expect.any(OrderPlacedEvent)]);

    order.cancel(false);
    expect(order.pullDomainEvents()).toEqual([expect.any(OrderCancelledEvent)]);
  });

  it('rejects invalid amounts, item lists, and shipping contacts', () => {
    expect(() =>
      OrderFactory.create({
        userId: '',
        status: OrderStatusEnum.PENDING,
        subtotal: 0,
        discountAmount: 0,
        total: 0,
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
        items: [],
      }),
    ).toThrow('Order user is required');
    expect(() =>
      OrderFactory.create({
        userId: 'user-1',
        status: OrderStatusEnum.PENDING,
        subtotal: 100,
        discountAmount: 20,
        total: 90,
        paymentStatus: PaymentStatusEnum.PENDING,
        shippingAddress: {
          fullName: '',
          phone: '',
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
            unitPrice: 100,
            totalPrice: 100,
            snapshot: { name: 'Product', sku: null, imageUrl: null },
          }),
        ],
      }),
    ).toThrow('Order total must equal subtotal minus discount');
  });
});
