import { ClearCartHandler } from '@/application/cart/commands/clear-cart/clear-cart.handler';
import { RemoveCartCouponHandler } from '@/application/cart/commands/remove-cart-coupon/remove-cart-coupon.handler';
import { RemoveFromCartHandler } from '@/application/cart/commands/remove-from-cart/remove-from-cart.handler';
import { UpdateCartItemHandler } from '@/application/cart/commands/update-cart-item/update-cart-item.handler';
import { GetCartHandler } from '@/application/cart/queries/get-cart/get-cart.handler';
import { CartProductService } from '@/application/cart/services/cart-product.service';
import { CartViewService } from '@/application/cart/services/cart-view.service';
import { CartFactory } from '@/domain/factories/cart.factory';
import { CartItemFactory } from '@/domain/factories/cart-item.factory';
import { ApplicationError } from '@/application/shared/errors/application.error';

const product = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'product-1',
  variantId: 'variant-1',
  name: 'Product',
  slug: 'product',
  price: 100_000,
  stock: 3,
  isActive: true,
  deletedAt: null,
  thumbnailUrl: null,
  ...overrides,
});

const cart = (couponId: string | null = null) =>
  CartFactory.create({
    id: 'cart-1',
    userId: 'user-1',
    couponId,
    items: [
      CartItemFactory.create({
        productId: 'product-1',
        variantId: 'variant-1',
        quantity: 1,
      }),
    ],
  });

describe('Cart application operations', () => {
  it('checks product availability and stock before changing a cart item', async () => {
    const lookup = {
      findByIds: jest.fn().mockResolvedValue([product()]),
      findSingleActiveByProductId: jest.fn(),
    };
    const service = new CartProductService(lookup as never);

    await expect(service.assertSellable('variant-1', 3)).resolves.toMatchObject(
      {
        id: 'product-1',
      },
    );
    lookup.findByIds.mockResolvedValueOnce([product({ stock: 2 })]);
    await expect(service.assertSellable('variant-1', 3)).rejects.toMatchObject({
      code: 'INSUFFICIENT_STOCK',
      kind: 'CONFLICT',
    });
    lookup.findByIds.mockResolvedValueOnce([product({ isActive: false })]);
    await expect(service.assertSellable('variant-1', 1)).rejects.toMatchObject({
      code: 'PRODUCT_UNAVAILABLE',
      kind: 'NOT_FOUND',
    });
  });

  it('builds an empty cart and reports unavailable items with coupon state', async () => {
    const lookup = {
      findByIds: jest.fn().mockResolvedValue([product({ stock: 0 })]),
      findSingleActiveByProductId: jest.fn(),
    };
    const coupons = {
      validateById: jest.fn().mockResolvedValue({
        valid: false,
        reason: 'EXPIRED',
        discountAmount: 0,
        coupon: { id: 'coupon-1', code: 'SALE' },
      }),
    };
    const service = new CartViewService(lookup as never, coupons as never);

    await expect(service.build(null)).resolves.toMatchObject({
      id: null,
      items: [],
      checkoutReady: false,
    });
    await expect(service.build(cart('coupon-1'))).resolves.toMatchObject({
      subtotal: 100_000,
      total: 100_000,
      checkoutReady: false,
      items: [{ isAvailable: false, availabilityReason: 'OUT_OF_STOCK' }],
      coupon: { code: 'SALE', isValid: false, reason: 'EXPIRED' },
    });
  });

  it('clears a cart by user ID', async () => {
    const repository = { deleteByUserId: jest.fn() };
    await new ClearCartHandler(repository as never).execute({
      userId: 'user-1',
    });
    expect(repository.deleteByUserId).toHaveBeenCalledWith('user-1');
  });

  it('returns an empty view when removing a coupon from a missing cart', async () => {
    const repository = { findByUserId: jest.fn().mockResolvedValue(null) };
    const view = {
      build: jest.fn().mockResolvedValue({ id: null, items: [] }),
    };
    const result = await new RemoveCartCouponHandler(
      repository as never,
      view as never,
    ).execute({
      userId: 'user-1',
    });

    expect(result).toEqual({ id: null, items: [] });
    expect(view.build).toHaveBeenCalledWith(null);
  });

  it('removes an item and maps a missing cart item to an application error', async () => {
    const repository = {
      findByUserId: jest.fn().mockResolvedValue(cart()),
      save: jest.fn(),
    };
    const handler = new RemoveFromCartHandler(repository as never);

    await handler.execute({ userId: 'user-1', variantId: 'variant-1' });
    expect(repository.save).toHaveBeenCalled();
    await expect(
      handler.execute({ userId: 'user-1', variantId: 'missing' }),
    ).rejects.toMatchObject({
      code: 'CART_ITEM_NOT_FOUND',
      kind: 'NOT_FOUND',
    });
  });

  it('updates an item through the product guard and returns the server cart view', async () => {
    const existingCart = cart();
    const repository = {
      findByUserId: jest.fn().mockResolvedValue(existingCart),
      save: jest.fn().mockResolvedValue(existingCart),
    };
    const products = { assertSellable: jest.fn() };
    const view = { build: jest.fn().mockResolvedValue({ itemCount: 2 }) };
    const handler = new UpdateCartItemHandler(
      repository as never,
      products as never,
      view as never,
    );

    await expect(
      handler.execute({
        userId: 'user-1',
        variantId: 'variant-1',
        quantity: 2,
      }),
    ).resolves.toEqual({ itemCount: 2 });
    expect(products.assertSellable).toHaveBeenCalledWith('variant-1', 2);
    expect(existingCart.items[0]?.quantity).toBe(2);

    repository.findByUserId.mockResolvedValueOnce(null);
    await expect(
      handler.execute({
        userId: 'user-1',
        variantId: 'variant-1',
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
  });

  it('delegates a cart read to the cart view service', async () => {
    const existingCart = cart();
    const repository = {
      findByUserId: jest.fn().mockResolvedValue(existingCart),
    };
    const view = {
      build: jest.fn().mockResolvedValue({ id: existingCart.id }),
    };

    await expect(
      new GetCartHandler(repository as never, view as never).execute({
        userId: 'user-1',
      }),
    ).resolves.toEqual({ id: 'cart-1' });
    expect(view.build).toHaveBeenCalledWith(existingCart);
  });
});
