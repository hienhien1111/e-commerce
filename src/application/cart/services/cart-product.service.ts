import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CartProductLookupPort } from '@/application/cart/ports/cart-product-lookup.port';
import { CART_PRODUCT_LOOKUP_PORT } from '@/application/cart/ports/cart-product-lookup.port.token';
import { CartProductSnapshot } from '@/application/cart/types/cart.types';

@Injectable()
export class CartProductService {
  constructor(
    @Inject(CART_PRODUCT_LOOKUP_PORT)
    private readonly productLookup: CartProductLookupPort,
  ) {}

  async assertSellable(
    productId: string,
    quantity: number,
  ): Promise<CartProductSnapshot> {
    const product = (await this.productLookup.findByIds([productId]))[0];
    if (!product || product.deletedAt || !product.isActive) {
      throw new NotFoundException('Product not found');
    }
    if (quantity > product.stock) {
      throw new ConflictException('Insufficient product stock');
    }
    return product;
  }
}
