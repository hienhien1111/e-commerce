import { Cart } from '@/domain/entities/cart';
import { NullableType } from '@/utils/types/nullable.type';

export interface CartRepositoryPort {
  create(cart: Cart): Promise<Cart>;
  save(cart: Cart): Promise<Cart>;
  findByUserId(userId: string): Promise<NullableType<Cart>>;
  deleteByUserId(userId: string): Promise<void>;
}
