import { Test } from '@nestjs/testing';
import { AddToCartCommand } from './add-to-cart.command';
import { AddToCartHandler } from './add-to-cart.handler';
import { CART_REPOSITORY_PORT } from '@/application/cart/ports/cart.repository.port.token';
import { CartProductService } from '@/application/cart/services/cart-product.service';
import { CartViewService } from '@/application/cart/services/cart-view.service';
import { CartFactory } from '@/domain/factories/cart.factory';
import { CartItemFactory } from '@/domain/factories/cart-item.factory';
import { ApplicationError } from '@/application/shared/errors/application.error';

describe('AddToCartHandler', () => {
  let repository: Record<string, jest.Mock>;
  let products: { assertSellable: jest.Mock; resolveProduct: jest.Mock };
  let view: { build: jest.Mock };
  let handler: AddToCartHandler;

  beforeEach(async () => {
    repository = {
      findByUserId: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    products = { assertSellable: jest.fn(), resolveProduct: jest.fn() };
    view = { build: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        AddToCartHandler,
        { provide: CART_REPOSITORY_PORT, useValue: repository },
        { provide: CartProductService, useValue: products },
        { provide: CartViewService, useValue: view },
      ],
    }).compile();
    handler = module.get(AddToCartHandler);
  });

  it('creates a cart lazily', async () => {
    repository.findByUserId.mockResolvedValue(null);
    repository.create.mockImplementation(async (cart) => cart);
    view.build.mockResolvedValue({ itemCount: 1 });
    products.assertSellable.mockResolvedValue({
      id: 'product',
      variantId: 'variant',
    });

    await expect(
      handler.execute(new AddToCartCommand('user', null, 'variant', 1)),
    ).resolves.toEqual({ itemCount: 1 });
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(products.assertSellable).toHaveBeenCalledWith('variant', 1);
  });

  it('adds to an existing quantity after checking aggregate stock', async () => {
    const cart = CartFactory.create({
      userId: 'user',
      couponId: null,
      items: [
        CartItemFactory.create({
          productId: 'product',
          variantId: 'variant',
          quantity: 2,
        }),
      ],
    });
    repository.findByUserId.mockResolvedValue(cart);
    repository.save.mockImplementation(async (saved) => saved);
    view.build.mockResolvedValue({ itemCount: 3 });
    products.assertSellable.mockResolvedValue({
      id: 'product',
      variantId: 'variant',
    });

    await handler.execute(new AddToCartCommand('user', null, 'variant', 1));
    expect(products.assertSellable).toHaveBeenCalledWith('variant', 3);
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('surfaces unavailable products and stock conflicts', async () => {
    repository.findByUserId.mockResolvedValue(null);
    products.assertSellable
      .mockRejectedValueOnce(
        new ApplicationError(
          'PRODUCT_UNAVAILABLE',
          'Product unavailable',
          'NOT_FOUND',
        ),
      )
      .mockRejectedValueOnce(
        new ApplicationError(
          'INSUFFICIENT_STOCK',
          'Insufficient stock',
          'CONFLICT',
        ),
      );
    await expect(
      handler.execute(new AddToCartCommand('user', null, 'variant', 1)),
    ).rejects.toMatchObject({ code: 'PRODUCT_UNAVAILABLE' });
    await expect(
      handler.execute(new AddToCartCommand('user', null, 'variant', 1)),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' });
  });

  it('reloads once when checkout changes the cart snapshot concurrently', async () => {
    const beforeCheckout = CartFactory.create({
      userId: 'user',
      couponId: null,
      items: [
        CartItemFactory.create({
          productId: 'captured-product',
          variantId: 'captured-variant',
          quantity: 1,
        }),
      ],
    });
    const afterCheckout = CartFactory.reconstitute({
      id: beforeCheckout.id,
      userId: 'user',
      couponId: null,
      items: [],
      createdAt: beforeCheckout.createdAt,
      updatedAt: new Date(beforeCheckout.updatedAt.getTime() + 1),
    });
    repository.findByUserId
      .mockResolvedValueOnce(beforeCheckout)
      .mockResolvedValueOnce(afterCheckout);
    repository.save
      .mockRejectedValueOnce(
        new ApplicationError(
          'CART_CONCURRENT_MODIFICATION',
          'Cart changed',
          'CONFLICT',
          true,
        ),
      )
      .mockImplementationOnce(async (saved) => saved);
    products.assertSellable.mockResolvedValue({
      id: 'new-product',
      variantId: 'new-variant',
    });
    view.build.mockResolvedValue({ itemCount: 1 });

    await expect(
      handler.execute(new AddToCartCommand('user', null, 'new-variant', 1)),
    ).resolves.toEqual({ itemCount: 1 });
    expect(repository.save).toHaveBeenCalledTimes(2);
    expect(afterCheckout.items).toHaveLength(1);
    expect(afterCheckout.items[0]?.variantId).toBe('new-variant');
  });
});
