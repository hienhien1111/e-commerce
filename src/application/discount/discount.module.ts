import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@/infrastructure/persistence/prisma/prisma.module';
import { PrismaCouponRepository } from '@/infrastructure/persistence/repositories/prisma-coupon.repository';
import { CouponController } from '@/presentation/http/controllers/coupon.controller';
import { COUPON_REPOSITORY_PORT } from '@/application/discount/ports/coupon.repository.port.token';
import { COUPON_VALIDATION_PORT } from '@/application/discount/ports/coupon-validation.port.token';
import { CouponValidationService } from '@/application/discount/services/coupon-validation.service';
import { CreateCouponHandler } from '@/application/discount/commands/create-coupon';
import { UpdateCouponHandler } from '@/application/discount/commands/update-coupon';
import { DeactivateCouponHandler } from '@/application/discount/commands/deactivate-coupon';
import { GetCouponHandler } from '@/application/discount/queries/get-coupon';
import { GetCouponsHandler } from '@/application/discount/queries/get-coupons';
import { ValidateCouponHandler } from '@/application/discount/queries/validate-coupon';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [CouponController],
  providers: [
    PrismaCouponRepository,
    CouponValidationService,
    CreateCouponHandler,
    UpdateCouponHandler,
    DeactivateCouponHandler,
    GetCouponHandler,
    GetCouponsHandler,
    ValidateCouponHandler,
    { provide: COUPON_REPOSITORY_PORT, useExisting: PrismaCouponRepository },
    { provide: COUPON_VALIDATION_PORT, useExisting: CouponValidationService },
  ],
  exports: [COUPON_VALIDATION_PORT],
})
export class DiscountModule {}
