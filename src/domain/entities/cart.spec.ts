import { CartItemNotFoundException } from '@/domain/exceptions/cart-item-not-found.exception';
import { CartFactory } from '@/domain/factories/cart.factory';
import { CartItemFactory } from '@/domain/factories/cart-item.factory';

describe('Cart', () => {
  const item = (productId: string, quantity: number) =>
    CartItemFactory.create({ productId, quantity });

  it('adds new items and increments an existing product', () => {
    const cart = CartFactory.create({
      userId: 'user-1',
      couponId: null,
      items: [],
    });
    cart.addItem(item('product-1', 1));
    cart.addItem(item('product-1', 2));

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(3);
    expect(cart.itemCount).toBe(3);
  });

  it('removes an item when quantity is updated to zero and clears coupon', () => {
    const cart = CartFactory.create({
      userId: 'user-1',
      couponId: 'coupon-1',
      items: [item('product-1', 2)],
    });

    cart.updateItem('product-1', 0);

    expect(cart.items).toEqual([]);
    expect(cart.couponId).toBeNull();
  });

  it('throws for an item that is not in the cart', () => {
    const cart = CartFactory.create({
      userId: 'user-1',
      couponId: null,
      items: [],
    });
    expect(() => cart.removeItem('missing')).toThrow(CartItemNotFoundException);
  });

  it('clears items and coupon together', () => {
    const cart = CartFactory.create({
      userId: 'user-1',
      couponId: 'coupon-1',
      items: [item('product-1', 1)],
    });
    cart.clear();
    expect(cart.items).toEqual([]);
    expect(cart.couponId).toBeNull();
  });
});
