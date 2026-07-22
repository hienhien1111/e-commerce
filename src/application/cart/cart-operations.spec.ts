import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApplyCartCouponHandler } from '@/application/cart/commands/apply-cart-coupon/apply-cart-coupon.handler';
import { ClearCartHandler } from '@/application/cart/commands/clear-cart/clear-cart.handler';
import { RemoveCartCouponHandler } from '@/application/cart/commands/remove-cart-coupon/remove-cart-coupon.handler';
import { RemoveFromCartHandler } from '@/application/cart/commands/remove-from-cart/remove-from-cart.handler';
import { UpdateCartItemHandler } from '@/application/cart/commands/update-cart-item/update-cart-item.handler';
import { GetCartHandler } from '@/application/cart/queries/get-cart/get-cart.handler';
import { CartProductService } from '@/application/cart/services/cart-product.service';
import { CartViewService } from '@/application/cart/services/cart-view.service';
import { CartProductSnapshot } from '@/application/cart/types/cart.types';
import { CouponFactory } from '@/domain/factories/coupon.factory';
import { CartFactory } from '@/domain/factories/cart.factory';
import { CartItemFactory } from '@/domain/factories/cart-item.factory';
import { DiscountTypeEnum } from '@/domain/enums/discount-type.enum';

const product = (
  overrides: Partial<CartProductSnapshot> = {},
): CartProductSnapshot => ({
  id: 'product-1',
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
    items: [CartItemFactory.create({ productId: 'product-1', quantity: 1 })],
  });

const coupon = (overrides: Record<string, unknown> = {}) =>
  CouponFactory.create({
    id: 'coupon-1',
    code: 'SALE10',
    discountType: DiscountTypeEnum.PERCENTAGE,
    discountValue: 10,
    maxDiscount: null,
    minOrderAmount: null,
    maxUsage: null,
    usedCount: 0,
    expiresAt: null,
    isActive: true,
    ...overrides,
  } as never);

describe('Cart application operations', () => {
  it('checks product existence, sellability, and stock before changing a cart', async () => {
    const lookup = { findByIds: jest.fn().mockResolvedValue([product()]) };
    const service = new CartProductService(lookup as never);

    await expect(service.assertSellable('product-1', 3)).resolves.toEqual(
      product(),
    );
    lookup.findByIds.mockResolvedValueOnce([]);
    await expect(service.assertSellable('missing', 1)).rejects.toThrow(
      NotFoundException,
    );
    lookup.findByIds.mockResolvedValueOnce([
      product({ deletedAt: new Date() }),
    ]);
    await expect(service.assertSellable('product-1', 1)).rejects.toThrow(
      NotFoundException,
    );
    lookup.findByIds.mockResolvedValueOnce([product({ isActive: false })]);
    await expect(service.assertSellable('product-1', 1)).rejects.toThrow(
      NotFoundException,
    );
    lookup.findByIds.mockResolvedValueOnce([product({ stock: 2 })]);
    await expect(service.assertSellable('product-1', 3)).rejects.toThrow(
      ConflictException,
    );
  });

  it('builds cart totals and preserves unavailable products and invalid coupons as warnings', async () => {
    const unavailable = CartFactory.create({
      id: 'cart-1',
      userId: 'user-1',
      couponId: 'coupon-1',
      items: [
        CartItemFactory.create({ productId: 'deleted', quantity: 1 }),
        CartItemFactory.create({ productId: 'inactive', quantity: 1 }),
        CartItemFactory.create({ productId: 'out', quantity: 1 }),
        CartItemFactory.create({ productId: 'short', quantity: 2 }),
      ],
    });
    const lookup = {
      findByIds: jest
        .fn()
        .mockResolvedValue([
          product({ id: 'deleted', deletedAt: new Date(), price: 10 }),
          product({ id: 'inactive', isActive: false, price: 20 }),
          product({ id: 'out', stock: 0, price: 30 }),
          product({ id: 'short', stock: 1, price: 40 }),
        ]),
    };
    const coupons = {
      validateById: jest.fn().mockResolvedValue({
        valid: false,
        discountAmount: 0,
        reason: 'EXPIRED',
        coupon: coupon(),
      }),
    };
    const service = new CartViewService(lookup as never, coupons as never);

    await expect(service.build(null)).resolves.toMatchObject({
      id: null,
      items: [],
      itemCount: 0,
      total: 0,
      checkoutReady: false,
    });
    await expect(service.build(unavailable)).resolves.toMatchObject({
      subtotal: 140,
      discountAmount: 0,
      total: 140,
      checkoutReady: false,
      items: [
        { availabilityReason: 'DELETED' },
        { availabilityReason: 'INACTIVE' },
        { availabilityReason: 'OUT_OF_STOCK' },
        { availabilityReason: 'INSUFFICIENT_STOCK' },
      ],
      coupon: { code: 'SALE10', isValid: false, reason: 'EXPIRED' },
    });
  });

  it('applies only a valid coupon to a non-empty cart and returns the saved view', async () => {
    const existing = cart();
    const repository = {
      findByUserId: jest.fn().mockResolvedValue(existing),
      save: jest.fn().mockResolvedValue(existing),
    };
    const validation = {
      validateByCode: jest.fn().mockResolvedValue({
        valid: true,
        discountAmount: 10_000,
        coupon: coupon(),
      }),
    };
    const view = {
      build: jest
        .fn()
        .mockResolvedValueOnce({ subtotal: 100_000 })
        .mockResolvedValueOnce({ coupon: { code: 'SALE10' } }),
    };
    const handler = new ApplyCartCouponHandler(
      repository as never,
      validation as never,
      view as never,
    );

    await expect(
      handler.execute({ userId: 'user-1', code: 'sale10' }),
    ).resolves.toEqual({ coupon: { code: 'SALE10' } });
    expect(validation.validateByCode).toHaveBeenCalledWith('sale10', 100_000);
    expect(repository.save).toHaveBeenCalledWith(existing);
    expect(existing.couponId).toBe('coupon-1');

    repository.findByUserId.mockResolvedValueOnce(null);
    await expect(
      handler.execute({ userId: 'user-1', code: 'sale10' }),
    ).rejects.toThrow(BadRequestException);

    repository.findByUserId.mockResolvedValueOnce(cart());
    view.build.mockResolvedValueOnce({ subtotal: 100_000 });
    validation.validateByCode.mockResolvedValueOnce({
      valid: false,
      discountAmount: 0,
      reason: 'EXPIRED',
    });
    await expect(
      handler.execute({ userId: 'user-1', code: 'expired' }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('clears by user and removes a coupon idempotently', async () => {
    const clearRepository = { deleteByUserId: jest.fn() };
    await new ClearCartHandler(clearRepository as never).execute({
      userId: 'user-1',
    });
    expect(clearRepository.deleteByUserId).toHaveBeenCalledWith('user-1');

    const repository = { findByUserId: jest.fn().mockResolvedValue(null) };
    const view = {
      build: jest.fn().mockResolvedValue({ id: null, items: [] }),
    };
    const removeCoupon = new RemoveCartCouponHandler(
      repository as never,
      view as never,
    );
    await expect(removeCoupon.execute({ userId: 'user-1' })).resolves.toEqual({
      id: null,
      items: [],
    });

    const existing = cart('coupon-1');
    repository.findByUserId.mockResolvedValueOnce(existing);
    (repository as Record<string, jest.Mock>).save = jest
      .fn()
      .mockResolvedValue(existing);
    await removeCoupon.execute({ userId: 'user-1' });
    expect(existing.couponId).toBeNull();
    expect(repository.save).toHaveBeenCalledWith(existing);
  });

  it('removes an item and maps absent carts or items to not found', async () => {
    const existing = cart('coupon-1');
    const repository = {
      findByUserId: jest.fn().mockResolvedValue(existing),
      save: jest.fn(),
    };
    const handler = new RemoveFromCartHandler(repository as never);

    await handler.execute({ userId: 'user-1', productId: 'product-1' });
    expect(existing.items).toEqual([]);
    expect(existing.couponId).toBeNull();
    expect(repository.save).toHaveBeenCalledWith(existing);

    repository.findByUserId.mockResolvedValueOnce(null);
    await expect(
      handler.execute({ userId: 'user-1', productId: 'missing' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('updates positive quantities through product validation and treats zero as removal', async () => {
    const existing = cart('coupon-1');
    const repository = {
      findByUserId: jest.fn().mockResolvedValue(existing),
      save: jest.fn().mockResolvedValue(existing),
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
        productId: 'product-1',
        quantity: 2,
      }),
    ).resolves.toEqual({ itemCount: 2 });
    expect(products.assertSellable).toHaveBeenCalledWith('product-1', 2);

    await handler.execute({
      userId: 'user-1',
      productId: 'product-1',
      quantity: 0,
    });
    expect(products.assertSellable).toHaveBeenCalledTimes(1);
    expect(existing.items).toEqual([]);
    expect(existing.couponId).toBeNull();

    repository.findByUserId.mockResolvedValueOnce(null);
    await expect(
      handler.execute({ userId: 'user-1', productId: 'missing', quantity: 1 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('delegates cart reads to the view service', async () => {
    const existing = cart();
    const repository = { findByUserId: jest.fn().mockResolvedValue(existing) };
    const view = { build: jest.fn().mockResolvedValue({ id: 'cart-1' }) };

    await expect(
      new GetCartHandler(repository as never, view as never).execute({
        userId: 'user-1',
      }),
    ).resolves.toEqual({ id: 'cart-1' });
    expect(view.build).toHaveBeenCalledWith(existing);
  });
});
