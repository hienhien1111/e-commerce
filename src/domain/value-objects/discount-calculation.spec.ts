import { DiscountTypeEnum } from '@/domain/enums/discount-type.enum';
import { CouponFactory } from '@/domain/factories/coupon.factory';
import { DiscountCalculation } from './discount-calculation';

const createCoupon = (overrides = {}) =>
  CouponFactory.create({
    code: 'SALE',
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

describe('DiscountCalculation', () => {
  it('calculates percentage discounts with a cap', () => {
    expect(
      DiscountCalculation.calculate(
        createCoupon({ maxDiscount: 30000 }),
        500000,
      ),
    ).toBe(30000);
  });

  it('does not discount a fixed amount below zero', () => {
    expect(
      DiscountCalculation.calculate(
        createCoupon({
          discountType: DiscountTypeEnum.FIXED_AMOUNT,
          discountValue: 50000,
        }),
        30000,
      ),
    ).toBe(30000);
  });
});
