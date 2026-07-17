import { BaseDomainModel } from '@/shared/domain/base-domain-model';

export type CartItemProps = { productId: string; quantity: number };

export class CartItem extends BaseDomainModel<CartItemProps> {
  private constructor(
    props: CartItemProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(props, id, createdAt, updatedAt);
    this.validate();
  }

  static _create(
    props: CartItemProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
  ): CartItem {
    return new CartItem(props, id, createdAt, updatedAt);
  }

  private validate(): void {
    if (!this.props.productId) throw new Error('Cart item product is required');
    if (!Number.isInteger(this.props.quantity) || this.props.quantity <= 0) {
      throw new Error('Cart item quantity must be a positive integer');
    }
  }

  get productId(): string {
    return this.props.productId;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  setQuantity(quantity: number): void {
    this.props.quantity = quantity;
    this.validate();
    this.touch();
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      productId: this.productId,
      quantity: this.quantity,
    };
  }
}
