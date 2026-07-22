import { CartProductSnapshot } from '@/application/cart/types/cart.types';

export interface CartProductLookupPort {
  findByIds(variantIds: string[]): Promise<CartProductSnapshot[]>;
  findSingleActiveByProductId(
    productId: string,
  ): Promise<CartProductSnapshot | null>;
}
