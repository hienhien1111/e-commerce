import {
  ConflictException,
  Inject,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { CouponRepositoryPort } from '@/application/discount/ports/coupon.repository.port';
import { COUPON_REPOSITORY_PORT } from '@/application/discount/ports/coupon.repository.port.token';
import { CouponFactory } from '@/domain/factories/coupon.factory';
import { CreateCouponCommand } from './create-coupon.command';

@CommandHandler(CreateCouponCommand)
export class CreateCouponHandler
  implements ICommandHandler<CreateCouponCommand>
{
  constructor(
    @Inject(COUPON_REPOSITORY_PORT)
    private readonly couponRepository: CouponRepositoryPort,
  ) {}

  async execute(command: CreateCouponCommand) {
    const code = command.payload.code.trim().toUpperCase();
    if (await this.couponRepository.findByCode(code)) {
      throw new ConflictException('Coupon code already exists');
    }
    if (
      command.payload.expiresAt !== undefined &&
      command.payload.expiresAt !== null &&
      command.payload.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnprocessableEntityException(
        'Coupon expiry must be in the future',
      );
    }
    try {
      return await this.couponRepository.create(
        CouponFactory.create({
          code,
          discountType: command.payload.discountType,
          discountValue: command.payload.discountValue,
          maxDiscount: command.payload.maxDiscount ?? null,
          minOrderAmount: command.payload.minOrderAmount ?? null,
          maxUsage: command.payload.maxUsage ?? null,
          usedCount: 0,
          expiresAt: command.payload.expiresAt ?? null,
          isActive: command.payload.isActive ?? true,
        }),
      );
    } catch (error) {
      if (error instanceof Error)
        throw new UnprocessableEntityException(error.message);
      throw error;
    }
  }
}
