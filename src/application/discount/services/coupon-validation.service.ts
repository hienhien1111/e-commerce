import { Inject, Injectable } from '@nestjs/common';
import type { CouponRepositoryPort } from '@/application/discount/ports/coupon.repository.port';
import { COUPON_REPOSITORY_PORT } from '@/application/discount/ports/coupon.repository.port.token';
import type { CouponValidationPort } from '@/application/discount/ports/coupon-validation.port';
import { CouponValidationResult } from '@/application/discount/types/coupon.types';
import { Coupon } from '@/domain/entities/coupon';
import { DiscountCalculation } from '@/domain/value-objects/discount-calculation';

@Injectable()
export class CouponValidationService implements CouponValidationPort {
  constructor(
    @Inject(COUPON_REPOSITORY_PORT)
    private readonly couponRepository: CouponRepositoryPort,
  ) {}

  async validateByCode(
    code: string,
    subtotal: number,
  ): Promise<CouponValidationResult> {
    const coupon = await this.couponRepository.findByCode(
      code.trim().toUpperCase(),
    );
    return this.validate(coupon, subtotal);
  }

  async validateById(
    id: string,
    subtotal: number,
  ): Promise<CouponValidationResult> {
    const coupon = await this.couponRepository.findById(id);
    return this.validate(coupon, subtotal);
  }

  private validate(
    coupon: Coupon | null,
    subtotal: number,
  ): CouponValidationResult {
    if (!coupon)
      return { valid: false, discountAmount: 0, reason: 'NOT_FOUND' };
    if (!coupon.isActive) {
      return { valid: false, discountAmount: 0, reason: 'INACTIVE', coupon };
    }
    if (coupon.isExpired()) {
      return { valid: false, discountAmount: 0, reason: 'EXPIRED', coupon };
    }
    if (coupon.isMaxUsageReached()) {
      return {
        valid: false,
        discountAmount: 0,
        reason: 'MAX_USAGE_REACHED',
        coupon,
      };
    }
    if (coupon.minOrderAmount !== null && subtotal < coupon.minOrderAmount) {
      return {
        valid: false,
        discountAmount: 0,
        reason: 'ORDER_BELOW_MINIMUM',
        coupon,
      };
    }
    return {
      valid: true,
      discountAmount: DiscountCalculation.calculate(coupon, subtotal),
      coupon,
    };
  }
}
