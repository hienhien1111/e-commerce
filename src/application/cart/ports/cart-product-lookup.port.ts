import { CartProductSnapshot } from '@/application/cart/types/cart.types';

export interface CartProductLookupPort {
  findByIds(ids: string[]): Promise<CartProductSnapshot[]>;
}
