import { BaseDomainModel } from '@/shared/domain/base-domain-model';
import { OrderItem } from '@/domain/entities/order-item';
import { OrderStatusEnum } from '@/domain/enums/order-status.enum';
import { PaymentStatusEnum } from '@/domain/enums/payment-status.enum';
import { PaymentMethodEnum } from '@/domain/enums/payment-method.enum';
import { OrderCancelledEvent } from '@/domain/events/order-cancelled.event';
import { OrderPlacedEvent } from '@/domain/events/order-placed.event';

export type ShippingAddress = {
  fullName: string;
  phone: string;
  addressLine: string;
  ward: string;
  district: string;
  city: string;
};

export type OrderCustomer = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

export type OrderProps = {
  userId: string;
  status: OrderStatusEnum;
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentMethod: PaymentMethodEnum;
  paymentStatus: PaymentStatusEnum;
  shippingAddress: ShippingAddress;
  couponId: string | null;
  note: string | null;
  items: OrderItem[];
  customer?: OrderCustomer;
};

const transitions: Record<OrderStatusEnum, readonly OrderStatusEnum[]> = {
  [OrderStatusEnum.PENDING]: [
    OrderStatusEnum.CONFIRMED,
    OrderStatusEnum.CANCELLED,
  ],
  [OrderStatusEnum.CONFIRMED]: [
    OrderStatusEnum.PROCESSING,
    OrderStatusEnum.CANCELLED,
  ],
  [OrderStatusEnum.PROCESSING]: [
    OrderStatusEnum.SHIPPED,
    OrderStatusEnum.CANCELLED,
  ],
  [OrderStatusEnum.SHIPPED]: [OrderStatusEnum.DELIVERED],
  [OrderStatusEnum.DELIVERED]: [],
  [OrderStatusEnum.CANCELLED]: [],
};

export class Order extends BaseDomainModel<OrderProps> {
  private _deletedAt: Date | null;

  private constructor(
    props: OrderProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
    deletedAt?: Date | null,
    emitPlaced = false,
  ) {
    super(props, id, createdAt, updatedAt);
    this._deletedAt = deletedAt ?? null;
    this.validate();
    if (emitPlaced) this.addDomainEvent(new OrderPlacedEvent(this));
  }

  static _create(
    props: OrderProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
    deletedAt?: Date | null,
    emitPlaced = false,
  ): Order {
    return new Order(props, id, createdAt, updatedAt, deletedAt, emitPlaced);
  }

  private validate(): void {
    if (!this.props.userId) throw new Error('Order user is required');
    if (this.props.items.length === 0) throw new Error('Order requires items');
    for (const amount of [
      this.props.subtotal,
      this.props.discountAmount,
      this.props.total,
    ]) {
      if (!Number.isInteger(amount) || amount < 0)
        throw new Error('Order amounts must be non-negative integers');
    }
    if (this.props.total !== this.props.subtotal - this.props.discountAmount) {
      throw new Error('Order total must equal subtotal minus discount');
    }
    if (
      !this.props.shippingAddress.fullName.trim() ||
      !this.props.shippingAddress.phone.trim()
    ) {
      throw new Error('Order shipping contact is required');
    }
  }

  get userId(): string {
    return this.props.userId;
  }
  get status(): OrderStatusEnum {
    return this.props.status;
  }
  get subtotal(): number {
    return this.props.subtotal;
  }
  get discountAmount(): number {
    return this.props.discountAmount;
  }
  get total(): number {
    return this.props.total;
  }
  get paymentStatus(): PaymentStatusEnum {
    return this.props.paymentStatus;
  }
  get paymentMethod(): PaymentMethodEnum {
    return this.props.paymentMethod;
  }
  get shippingAddress(): ShippingAddress {
    return this.props.shippingAddress;
  }
  get couponId(): string | null {
    return this.props.couponId;
  }
  get note(): string | null {
    return this.props.note;
  }
  get items(): readonly OrderItem[] {
    return this.props.items;
  }
  get customer(): OrderCustomer | undefined {
    return this.props.customer;
  }
  get deletedAt(): Date | null {
    return this._deletedAt;
  }

  canCancel(allowProcessing: boolean): boolean {
    if (this.paymentStatus === PaymentStatusEnum.PAID) return false;
    return (
      this.status === OrderStatusEnum.PENDING ||
      this.status === OrderStatusEnum.CONFIRMED ||
      (allowProcessing && this.status === OrderStatusEnum.PROCESSING)
    );
  }

  transitionTo(next: OrderStatusEnum): void {
    if (!transitions[this.status].includes(next)) {
      throw new Error(`Cannot transition order from ${this.status} to ${next}`);
    }
    this.props.status = next;
    this.touch();
  }

  /**
   * Payment callbacks may arrive after a staff member has already advanced
   * fulfillment. Only confirm a pending order; never move a later status
   * backwards. PR11's payment adapter calls this idempotently.
   */
  confirmFromPayment(): boolean {
    if (this.status !== OrderStatusEnum.PENDING) return false;
    this.transitionTo(OrderStatusEnum.CONFIRMED);
    return true;
  }

  /** Records settlement without changing a fulfilled or cancelled status. */
  markPaidFromPayment(): boolean {
    if (this.paymentStatus === PaymentStatusEnum.PAID) return false;
    this.props.paymentStatus = PaymentStatusEnum.PAID;
    if (!this.confirmFromPayment()) this.touch();
    return true;
  }

  cancel(allowProcessing: boolean): void {
    if (!this.canCancel(allowProcessing))
      throw new Error('Order cannot be cancelled');
    this.props.status = OrderStatusEnum.CANCELLED;
    this.touch();
    this.addDomainEvent(new OrderCancelledEvent(this));
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      userId: this.userId,
      status: this.status,
      subtotal: this.subtotal,
      discountAmount: this.discountAmount,
      total: this.total,
      paymentMethod: this.paymentMethod,
      paymentStatus: this.paymentStatus,
      shippingAddress: this.shippingAddress,
      couponId: this.couponId,
      note: this.note,
      items: this.items.map((item) => item.toJSON()),
      ...(this.customer ? { customer: this.customer } : {}),
      deletedAt: this.deletedAt,
    };
  }
}
