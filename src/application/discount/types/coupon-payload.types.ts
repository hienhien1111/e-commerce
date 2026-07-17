import { DiscountTypeEnum } from '@/domain/enums/discount-type.enum';

export type CreateCouponPayload = {
  code: string;
  discountType: DiscountTypeEnum;
  discountValue: number;
  maxDiscount?: number | null;
  minOrderAmount?: number | null;
  maxUsage?: number | null;
  expiresAt?: Date | null;
  isActive?: boolean;
};

export type UpdateCouponPayload = Partial<CreateCouponPayload>;
