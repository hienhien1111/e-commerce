import { Coupon } from '@/domain/entities/coupon';
import { DiscountTypeEnum } from '@/domain/enums/discount-type.enum';

export class DiscountCalculation {
  static calculate(coupon: Coupon, subtotal: number): number {
    if (!Number.isInteger(subtotal) || subtotal < 0) {
      throw new Error('Subtotal must be a non-negative integer');
    }
    if (coupon.discountType === DiscountTypeEnum.FIXED_AMOUNT) {
      return Math.min(coupon.discountValue, subtotal);
    }
    const discount = Math.floor((subtotal * coupon.discountValue) / 100);
    return Math.min(
      discount,
      coupon.maxDiscount ?? Number.MAX_SAFE_INTEGER,
      subtotal,
    );
  }
}
