import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@/infrastructure/persistence/prisma/prisma.module';
import { PrismaCouponRepository } from '@/infrastructure/persistence/repositories/prisma-coupon.repository';
import { COUPON_REPOSITORY_PORT } from '@/application/discount/ports/coupon.repository.port.token';
import { COUPON_VALIDATION_PORT } from '@/application/discount/ports/coupon-validation.port.token';
import { CouponValidationService } from '@/application/discount/services/coupon-validation.service';

@Module({
  imports: [CqrsModule, PrismaModule],
  providers: [
    PrismaCouponRepository,
    CouponValidationService,
    { provide: COUPON_REPOSITORY_PORT, useExisting: PrismaCouponRepository },
    { provide: COUPON_VALIDATION_PORT, useExisting: CouponValidationService },
  ],
  exports: [COUPON_VALIDATION_PORT],
})
export class DiscountModule {}
