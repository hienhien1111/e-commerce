import { DiscountTypeEnum } from '@/domain/enums/discount-type.enum';
import { CouponFactory } from '@/domain/factories/coupon.factory';

const coupon = (overrides = {}) =>
  CouponFactory.create({
    code: 'SALE10',
    discountType: DiscountTypeEnum.PERCENTAGE,
    discountValue: 10,
    maxDiscount: null,
    minOrderAmount: null,
    maxUsage: null,
    usedCount: 0,
    expiresAt: null,
    isActive: true,
    ...overrides,
  });

describe('Coupon', () => {
  it('recognizes expiration and maximum usage', () => {
    expect(coupon({ expiresAt: new Date(Date.now() - 1) }).isExpired()).toBe(
      true,
    );
    expect(coupon({ maxUsage: 2, usedCount: 2 }).isMaxUsageReached()).toBe(
      true,
    );
  });

  it('rejects a maximum discount for a fixed coupon', () => {
    expect(() =>
      coupon({
        discountType: DiscountTypeEnum.FIXED_AMOUNT,
        discountValue: 10000,
        maxDiscount: 5000,
      }),
    ).toThrow('Maximum discount is only valid for percentage coupons');
  });
});
