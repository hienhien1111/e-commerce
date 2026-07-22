import { Coupon, CouponProps } from '@/domain/entities/coupon';
import { generateUuidV7 } from '@/utils/uuid-v7';

export type CreateCouponInput = CouponProps & { id?: string };
export type ReconstituteCouponInput = CouponProps & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export class CouponFactory {
  static create(input: CreateCouponInput): Coupon {
    return Coupon._create(input, input.id ?? generateUuidV7());
  }

  static reconstitute(input: ReconstituteCouponInput): Coupon {
    return Coupon._create(
      input,
      input.id,
      input.createdAt,
      input.updatedAt,
      input.deletedAt,
    );
  }
}
