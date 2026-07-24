import { BaseDomainModel } from '@/shared/domain/base-domain-model';
import { CartItem } from '@/domain/entities/cart-item';
import { CartItemNotFoundException } from '@/domain/exceptions/cart-item-not-found.exception';

export type CartProps = {
  userId: string;
  couponId: string | null;
  items: CartItem[];
};

export class Cart extends BaseDomainModel<CartProps> {
  private constructor(
    props: CartProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(props, id, createdAt, updatedAt);
    this.validate();
  }

  static _create(
    props: CartProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
  ): Cart {
    return new Cart(props, id, createdAt, updatedAt);
  }

  private validate(): void {
    if (!this.props.userId) throw new Error('Cart user is required');
    const variantIds = this.props.items.map((item) => item.variantId);
    if (new Set(variantIds).size !== variantIds.length) {
      throw new Error('Cart cannot contain the same variant twice');
    }
  }

  get userId(): string {
    return this.props.userId;
  }

  get couponId(): string | null {
    return this.props.couponId;
  }

  get items(): readonly CartItem[] {
    return this.props.items;
  }

  get itemCount(): number {
    return this.props.items.reduce((count, item) => count + item.quantity, 0);
  }

  addItem(item: CartItem): void {
    const existing = this.props.items.find(
      (candidate) => candidate.variantId === item.variantId,
    );
    if (existing) {
      existing.setQuantity(existing.quantity + item.quantity);
    } else {
      this.props.items.push(item);
    }
    this.touch();
  }

  updateItem(variantId: string, quantity: number): void {
    if (quantity === 0) {
      this.removeItem(variantId);
      return;
    }
    const item = this.props.items.find(
      (candidate) => candidate.variantId === variantId,
    );
    if (!item) throw new CartItemNotFoundException(variantId);
    item.setQuantity(quantity);
    this.touch();
  }

  removeItem(variantId: string): void {
    const index = this.props.items.findIndex(
      (candidate) => candidate.variantId === variantId,
    );
    if (index < 0) throw new CartItemNotFoundException(variantId);
    this.props.items.splice(index, 1);
    if (this.props.items.length === 0) this.props.couponId = null;
    this.touch();
  }

  clear(): void {
    this.props.items = [];
    this.props.couponId = null;
    this.touch();
  }

  applyCoupon(couponId: string): void {
    this.props.couponId = couponId;
    this.touch();
  }

  removeCoupon(): void {
    if (this.props.couponId !== null) {
      this.props.couponId = null;
      this.touch();
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      userId: this.userId,
      couponId: this.couponId,
      items: this.items.map((item) => item.toJSON()),
    };
  }
}
