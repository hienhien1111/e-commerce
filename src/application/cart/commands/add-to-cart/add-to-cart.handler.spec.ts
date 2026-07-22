import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AddToCartCommand } from './add-to-cart.command';
import { AddToCartHandler } from './add-to-cart.handler';
import { CART_REPOSITORY_PORT } from '@/application/cart/ports/cart.repository.port.token';
import { CartProductService } from '@/application/cart/services/cart-product.service';
import { CartViewService } from '@/application/cart/services/cart-view.service';
import { CartFactory } from '@/domain/factories/cart.factory';
import { CartItemFactory } from '@/domain/factories/cart-item.factory';

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
      .mockRejectedValueOnce(new NotFoundException())
      .mockRejectedValueOnce(new ConflictException());
    await expect(
      handler.execute(new AddToCartCommand('user', null, 'variant', 1)),
    ).rejects.toThrow(NotFoundException);
    await expect(
      handler.execute(new AddToCartCommand('user', null, 'variant', 1)),
    ).rejects.toThrow(ConflictException);
  });
});
