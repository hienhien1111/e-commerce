import { Inject, Injectable } from '@nestjs/common';
import type { CartProductLookupPort } from '@/application/cart/ports/cart-product-lookup.port';
import { CART_PRODUCT_LOOKUP_PORT } from '@/application/cart/ports/cart-product-lookup.port.token';
import {
  CartProductSnapshot,
  CartAvailabilityReason,
  CartView,
} from '@/application/cart/types/cart.types';
import type { CouponValidationPort } from '@/application/discount/ports/coupon-validation.port';
import { COUPON_VALIDATION_PORT } from '@/application/discount/ports/coupon-validation.port.token';
import { Cart } from '@/domain/entities/cart';

const unavailableProduct = (id: string): CartProductSnapshot => ({
  id,
  variantId: id,
  name: 'Sản phẩm không còn tồn tại',
  slug: '',
  label: null,
  sku: '',
  price: 0,
  stock: 0,
  isActive: false,
  deletedAt: new Date(0),
  thumbnailUrl: null,
});

@Injectable()
export class CartViewService {
  constructor(
    @Inject(CART_PRODUCT_LOOKUP_PORT)
    private readonly productLookup: CartProductLookupPort,
    @Inject(COUPON_VALIDATION_PORT)
    private readonly couponValidation: CouponValidationPort,
  ) {}

  async build(cart: Cart | null): Promise<CartView> {
    if (!cart) {
      return {
        id: null,
        items: [],
        itemCount: 0,
        subtotal: 0,
        discountAmount: 0,
        total: 0,
        checkoutReady: false,
        coupon: null,
      };
    }
    const products = await this.productLookup.findByIds(
      cart.items.map((item) => item.variantId),
    );
    const byId = new Map(
      products.map((product) => [product.variantId, product]),
    );
    const items = cart.items.map((item) => {
      const product =
        byId.get(item.variantId) ?? unavailableProduct(item.variantId);
      const availabilityReason = this.getAvailabilityReason(
        product,
        item.quantity,
      );
      return {
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        product,
        isAvailable: availabilityReason === null,
        availabilityReason,
      };
    });
    const subtotal = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );
    const evaluation = cart.couponId
      ? await this.couponValidation.validateById(cart.couponId, subtotal)
      : null;
    const discountAmount = evaluation?.valid ? evaluation.discountAmount : 0;
    return {
      id: cart.id,
      items,
      itemCount: cart.itemCount,
      subtotal,
      discountAmount,
      total: subtotal - discountAmount,
      checkoutReady:
        items.length > 0 && items.every((item) => item.isAvailable),
      coupon: evaluation?.coupon
        ? {
            id: evaluation.coupon.id,
            code: evaluation.coupon.code,
            isValid: evaluation.valid,
            ...(evaluation.reason ? { reason: evaluation.reason } : {}),
            discountAmount,
          }
        : null,
    };
  }

  private getAvailabilityReason(
    product: CartProductSnapshot,
    quantity: number,
  ): CartAvailabilityReason | null {
    if (product.deletedAt) return 'DELETED';
    if (!product.isActive) return 'INACTIVE';
    if (product.stock <= 0) return 'OUT_OF_STOCK';
    if (quantity > product.stock) return 'INSUFFICIENT_STOCK';
    return null;
  }
}
