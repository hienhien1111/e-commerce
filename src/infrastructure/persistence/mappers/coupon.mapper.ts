import type { Coupon as PrismaCoupon } from '@/generated/prisma/client';
import { Coupon } from '@/domain/entities/coupon';
import { DiscountTypeEnum } from '@/domain/enums/discount-type.enum';
import { CouponFactory } from '@/domain/factories/coupon.factory';

export class CouponMapper {
  static toDomain(raw: PrismaCoupon): Coupon {
    return CouponFactory.reconstitute({
      id: raw.id,
      code: raw.code,
      discountType: raw.discountType as DiscountTypeEnum,
      discountValue: raw.discountValue.toNumber(),
      maxDiscount: raw.maxDiscount?.toNumber() ?? null,
      minOrderAmount: raw.minOrderAmount?.toNumber() ?? null,
      maxUsage: raw.maxUsage,
      usedCount: raw.usedCount,
      expiresAt: raw.expiresAt,
      isActive: raw.isActive,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
    });
  }

  static toPersistence(coupon: Coupon) {
    return {
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxDiscount: coupon.maxDiscount,
      minOrderAmount: coupon.minOrderAmount,
      maxUsage: coupon.maxUsage,
      usedCount: coupon.usedCount,
      expiresAt: coupon.expiresAt,
      isActive: coupon.isActive,
      createdAt: coupon.createdAt,
      updatedAt: coupon.updatedAt,
      deletedAt: coupon.deletedAt,
    };
  }
}
