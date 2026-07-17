import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { CouponRepositoryPort } from '@/application/discount/ports/coupon.repository.port';
import { COUPON_REPOSITORY_PORT } from '@/application/discount/ports/coupon.repository.port.token';
import { DeactivateCouponCommand } from './deactivate-coupon.command';

@CommandHandler(DeactivateCouponCommand)
export class DeactivateCouponHandler
  implements ICommandHandler<DeactivateCouponCommand>
{
  constructor(
    @Inject(COUPON_REPOSITORY_PORT)
    private readonly couponRepository: CouponRepositoryPort,
  ) {}

  async execute(command: DeactivateCouponCommand) {
    const coupon = await this.couponRepository.findById(command.id);
    if (!coupon) throw new NotFoundException('Coupon not found');
    coupon.deactivate();
    return this.couponRepository.save(coupon);
  }
}
