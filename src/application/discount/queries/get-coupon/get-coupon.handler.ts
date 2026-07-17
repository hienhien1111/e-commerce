import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { CouponRepositoryPort } from '@/application/discount/ports/coupon.repository.port';
import { COUPON_REPOSITORY_PORT } from '@/application/discount/ports/coupon.repository.port.token';
import { GetCouponQuery } from './get-coupon.query';

@QueryHandler(GetCouponQuery)
export class GetCouponHandler implements IQueryHandler<GetCouponQuery> {
  constructor(
    @Inject(COUPON_REPOSITORY_PORT)
    private readonly couponRepository: CouponRepositoryPort,
  ) {}

  async execute(query: GetCouponQuery) {
    const coupon = await this.couponRepository.findById(query.id);
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }
}
