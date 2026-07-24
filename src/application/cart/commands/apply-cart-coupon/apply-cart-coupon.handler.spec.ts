import { describe, expect, it, mock } from 'bun:test';
import { ApplyCartCouponHandler } from './apply-cart-coupon.handler';
import { ApplyCartCouponCommand } from './apply-cart-coupon.command';

describe('ApplyCartCouponHandler', () => {
  it('rejects a known but currently invalid coupon before mutating the cart', async () => {
    const cart = {
      items: [{ productId: 'product-1', quantity: 1 }],
      applyCoupon: mock(),
    };
    const repository = {
      findByUserId: mock(async () => cart),
      save: mock(async () => cart),
    };
    const validation = {
      validateByCode: mock(async () => ({
        valid: false,
        discountAmount: 0,
        reason: 'MAX_USAGE_REACHED',
        coupon: { id: 'coupon-1' },
      })),
    };
    const view = {
      build: mock(async () => ({ subtotal: 100000 })),
    };
    const handler = new ApplyCartCouponHandler(
      repository as never,
      validation as never,
      view as never,
    );

    await expect(
      handler.execute(new ApplyCartCouponCommand('user-1', 'ONEUSE')),
    ).rejects.toMatchObject({
      code: 'COUPON_INVALID',
      details: { reason: 'MAX_USAGE_REACHED' },
    });

    expect(cart.applyCoupon).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });
});
