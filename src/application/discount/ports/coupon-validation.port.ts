import { CouponValidationResult } from '@/application/discount/types/coupon.types';

export interface CouponValidationPort {
  validateByCode(
    code: string,
    subtotal: number,
  ): Promise<CouponValidationResult>;
  validateById(id: string, subtotal: number): Promise<CouponValidationResult>;
}
