import { Coupon } from '@/domain/entities/coupon';
import { NullableType } from '@/utils/types/nullable.type';

export interface CouponRepositoryPort {
  create(coupon: Coupon): Promise<Coupon>;
  save(coupon: Coupon): Promise<Coupon>;
  findById(id: string): Promise<NullableType<Coupon>>;
  findByCode(code: string): Promise<NullableType<Coupon>>;
  findAll(): Promise<Coupon[]>;
}
