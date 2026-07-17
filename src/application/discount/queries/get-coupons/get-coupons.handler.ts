import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { CouponRepositoryPort } from '@/application/discount/ports/coupon.repository.port';
import { COUPON_REPOSITORY_PORT } from '@/application/discount/ports/coupon.repository.port.token';
import { GetCouponsQuery } from './get-coupons.query';

@QueryHandler(GetCouponsQuery)
export class GetCouponsHandler implements IQueryHandler<GetCouponsQuery> {
  constructor(
    @Inject(COUPON_REPOSITORY_PORT)
    private readonly couponRepository: CouponRepositoryPort,
  ) {}

  async execute(_: GetCouponsQuery) {
    return this.couponRepository.findAll();
  }
}
