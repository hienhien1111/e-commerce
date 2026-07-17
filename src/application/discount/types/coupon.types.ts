import { Coupon } from '@/domain/entities/coupon';

export type CouponInvalidReason =
  | 'NOT_FOUND'
  | 'INACTIVE'
  | 'EXPIRED'
  | 'MAX_USAGE_REACHED'
  | 'ORDER_BELOW_MINIMUM';

export type CouponValidationResult = {
  valid: boolean;
  discountAmount: number;
  reason?: CouponInvalidReason;
  coupon?: Coupon;
};
