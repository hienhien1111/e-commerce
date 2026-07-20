import { BaseDomainModel } from '@/shared/domain/base-domain-model';

export type OrderItemSnapshot = {
  name: string;
  sku: string | null;
  imageUrl: string | null;
};

export type OrderItemProps = {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  snapshot: OrderItemSnapshot;
};

export class OrderItem extends BaseDomainModel<OrderItemProps> {
  private constructor(props: OrderItemProps, id: string) {
    super(props, id);
    if (!props.productId) throw new Error('Order item product is required');
    if (!Number.isInteger(props.quantity) || props.quantity <= 0) {
      throw new Error('Order item quantity must be a positive integer');
    }
    if (!Number.isInteger(props.unitPrice) || props.unitPrice < 0) {
      throw new Error('Order item price must be a non-negative integer');
    }
    if (props.totalPrice !== props.unitPrice * props.quantity) {
      throw new Error('Order item total must match unit price and quantity');
    }
  }

  static _create(props: OrderItemProps, id: string): OrderItem {
    return new OrderItem(props, id);
  }

  get productId(): string {
    return this.props.productId;
  }
  get quantity(): number {
    return this.props.quantity;
  }
  get unitPrice(): number {
    return this.props.unitPrice;
  }
  get totalPrice(): number {
    return this.props.totalPrice;
  }
  get snapshot(): OrderItemSnapshot {
    return this.props.snapshot;
  }

  toJSON(): Record<string, unknown> {
    return { ...super.toJSON(), ...this.props };
  }
}
