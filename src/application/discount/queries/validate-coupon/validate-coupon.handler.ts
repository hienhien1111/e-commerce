import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { CouponValidationPort } from '@/application/discount/ports/coupon-validation.port';
import { COUPON_VALIDATION_PORT } from '@/application/discount/ports/coupon-validation.port.token';
import { ValidateCouponQuery } from './validate-coupon.query';

@QueryHandler(ValidateCouponQuery)
export class ValidateCouponHandler
  implements IQueryHandler<ValidateCouponQuery>
{
  constructor(
    @Inject(COUPON_VALIDATION_PORT)
    private readonly couponValidation: CouponValidationPort,
  ) {}

  async execute(query: ValidateCouponQuery) {
    const result = await this.couponValidation.validateByCode(
      query.code,
      query.total,
    );
    return {
      valid: result.valid,
      discountAmount: result.discountAmount,
      ...(result.reason ? { reason: result.reason } : {}),
    };
  }
}
