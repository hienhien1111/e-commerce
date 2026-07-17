import {
  ConflictException,
  Inject,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { CouponRepositoryPort } from '@/application/discount/ports/coupon.repository.port';
import { COUPON_REPOSITORY_PORT } from '@/application/discount/ports/coupon.repository.port.token';
import { UpdateCouponCommand } from './update-coupon.command';

@CommandHandler(UpdateCouponCommand)
export class UpdateCouponHandler
  implements ICommandHandler<UpdateCouponCommand>
{
  constructor(
    @Inject(COUPON_REPOSITORY_PORT)
    private readonly couponRepository: CouponRepositoryPort,
  ) {}

  async execute(command: UpdateCouponCommand) {
    const coupon = await this.couponRepository.findById(command.id);
    if (!coupon) throw new NotFoundException('Coupon not found');
    const payload = { ...command.payload };
    if (payload.code !== undefined) {
      payload.code = payload.code.trim().toUpperCase();
      const duplicate = await this.couponRepository.findByCode(payload.code);
      if (duplicate && duplicate.id !== coupon.id) {
        throw new ConflictException('Coupon code already exists');
      }
    }
    if (
      payload.expiresAt !== undefined &&
      payload.expiresAt !== null &&
      payload.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnprocessableEntityException(
        'Coupon expiry must be in the future',
      );
    }
    if (
      payload.maxUsage !== undefined &&
      payload.maxUsage !== null &&
      payload.maxUsage < coupon.usedCount
    ) {
      throw new UnprocessableEntityException(
        'Maximum usage cannot be lower than used count',
      );
    }
    try {
      coupon.update(payload);
      return await this.couponRepository.save(coupon);
    } catch (error) {
      if (error instanceof Error)
        throw new UnprocessableEntityException(error.message);
      throw error;
    }
  }
}
