import { Inject, Injectable } from '@nestjs/common';
import type { CartProductLookupPort } from '@/application/cart/ports/cart-product-lookup.port';
import { CART_PRODUCT_LOOKUP_PORT } from '@/application/cart/ports/cart-product-lookup.port.token';
import { CartProductSnapshot } from '@/application/cart/types/cart.types';
import { ApplicationError } from '@/application/shared/errors/application.error';

@Injectable()
export class CartProductService {
  constructor(
    @Inject(CART_PRODUCT_LOOKUP_PORT)
    private readonly productLookup: CartProductLookupPort,
  ) {}

  async assertSellable(
    variantId: string,
    quantity: number,
  ): Promise<CartProductSnapshot> {
    const product = (await this.productLookup.findByIds([variantId]))[0];
    if (!product || product.deletedAt || !product.isActive) {
      throw new ApplicationError(
        'PRODUCT_UNAVAILABLE',
        'Product not found',
        'NOT_FOUND',
      );
    }
    if (quantity > product.stock) {
      throw new ApplicationError(
        'INSUFFICIENT_STOCK',
        'Insufficient product stock',
        'CONFLICT',
      );
    }
    return product;
  }

  async resolveProduct(productId: string): Promise<CartProductSnapshot> {
    const variant =
      await this.productLookup.findSingleActiveByProductId(productId);
    if (!variant || variant.deletedAt || !variant.isActive) {
      throw new ApplicationError(
        'PRODUCT_UNAVAILABLE',
        'Product not found',
        'NOT_FOUND',
      );
    }
    const candidates = await this.productLookup.findByIds([variant.variantId]);
    if (candidates.length !== 1)
      throw new ApplicationError(
        'PRODUCT_UNAVAILABLE',
        'Product not found',
        'NOT_FOUND',
      );
    return candidates[0];
  }
}
