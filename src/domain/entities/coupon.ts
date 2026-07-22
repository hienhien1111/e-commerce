import { BaseDomainModel } from '@/shared/domain/base-domain-model';
import { DiscountTypeEnum } from '@/domain/enums/discount-type.enum';

export type CouponProps = {
  code: string;
  discountType: DiscountTypeEnum;
  discountValue: number;
  maxDiscount: number | null;
  minOrderAmount: number | null;
  maxUsage: number | null;
  usedCount: number;
  expiresAt: Date | null;
  isActive: boolean;
};

export class Coupon extends BaseDomainModel<CouponProps> {
  private _deletedAt: Date | null;

  private constructor(
    props: CouponProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
    deletedAt?: Date | null,
  ) {
    super(props, id, createdAt, updatedAt);
    this._deletedAt = deletedAt ?? null;
    this.validate();
  }

  static _create(
    props: CouponProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
    deletedAt?: Date | null,
  ): Coupon {
    return new Coupon(props, id, createdAt, updatedAt, deletedAt);
  }

  private validate(): void {
    if (!this.props.code.trim()) throw new Error('Coupon code is required');
    if (
      !Number.isInteger(this.props.discountValue) ||
      this.props.discountValue <= 0
    ) {
      throw new Error('Coupon discount value must be a positive integer');
    }
    if (
      this.props.discountType === DiscountTypeEnum.PERCENTAGE &&
      this.props.discountValue > 100
    ) {
      throw new Error('Percentage discount cannot exceed 100');
    }
    if (
      this.props.maxDiscount !== null &&
      (!Number.isInteger(this.props.maxDiscount) ||
        this.props.maxDiscount <= 0 ||
        this.props.discountType !== DiscountTypeEnum.PERCENTAGE)
    ) {
      throw new Error('Maximum discount is only valid for percentage coupons');
    }
    if (
      this.props.minOrderAmount !== null &&
      (!Number.isInteger(this.props.minOrderAmount) ||
        this.props.minOrderAmount < 0)
    ) {
      throw new Error('Minimum order amount must be a non-negative integer');
    }
    if (
      this.props.maxUsage !== null &&
      (!Number.isInteger(this.props.maxUsage) || this.props.maxUsage <= 0)
    ) {
      throw new Error('Maximum usage must be a positive integer');
    }
    if (!Number.isInteger(this.props.usedCount) || this.props.usedCount < 0) {
      throw new Error('Used count must be a non-negative integer');
    }
  }

  get code(): string {
    return this.props.code;
  }
  get discountType(): DiscountTypeEnum {
    return this.props.discountType;
  }
  get discountValue(): number {
    return this.props.discountValue;
  }
  get maxDiscount(): number | null {
    return this.props.maxDiscount;
  }
  get minOrderAmount(): number | null {
    return this.props.minOrderAmount;
  }
  get maxUsage(): number | null {
    return this.props.maxUsage;
  }
  get usedCount(): number {
    return this.props.usedCount;
  }
  get expiresAt(): Date | null {
    return this.props.expiresAt;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }
  get deletedAt(): Date | null {
    return this._deletedAt;
  }

  isExpired(now = new Date()): boolean {
    return this.expiresAt !== null && this.expiresAt.getTime() <= now.getTime();
  }

  isMaxUsageReached(): boolean {
    return this.maxUsage !== null && this.usedCount >= this.maxUsage;
  }

  update(input: Partial<Omit<CouponProps, 'usedCount'>>): void {
    Object.assign(this.props, input);
    this.validate();
    this.touch();
  }

  deactivate(): void {
    if (this.props.isActive) {
      this.props.isActive = false;
      this.touch();
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      code: this.code,
      discountType: this.discountType,
      discountValue: this.discountValue,
      maxDiscount: this.maxDiscount,
      minOrderAmount: this.minOrderAmount,
      maxUsage: this.maxUsage,
      usedCount: this.usedCount,
      expiresAt: this.expiresAt,
      isActive: this.isActive,
      deletedAt: this.deletedAt,
    };
  }
}
