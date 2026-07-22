'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { Cart, emptyCart } from '@/lib/cart';
import { CartSidebar } from '@/components/cart/CartSidebar';

type CartContextValue = {
  cart: Cart;
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
  refresh: () => Promise<void>;
  addItem: (productId: string, quantity: number) => Promise<void>;
  updateItem: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clear: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>(emptyCart);
  const [isOpen, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!auth.isLoggedIn()) {
      setCart(emptyCart());
      return;
    }
    setCart(await api.get<Cart>('v1/cart'));
  }, []);

  useEffect(() => {
    const syncSession = () => {
      void refresh().catch(() => setCart(emptyCart()));
    };
    syncSession();
    window.addEventListener('auth:changed', syncSession);
    return () => window.removeEventListener('auth:changed', syncSession);
  }, [refresh]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      isOpen,
      setOpen,
      refresh,
      addItem: async (productId, quantity) => {
        const result = await api.post<Cart>('v1/cart/items', {
          productId,
          quantity,
        });
        setCart(result);
        setOpen(true);
      },
      updateItem: async (productId, quantity) => {
        const result = await api.patch<Cart>(`v1/cart/items/${productId}`, {
          quantity,
        });
        setCart(result);
      },
      removeItem: async (productId) => {
        await api.delete(`v1/cart/items/${productId}`);
        await refresh();
      },
      clear: async () => {
        await api.delete('v1/cart');
        setCart(emptyCart());
      },
      applyCoupon: async (code) => {
        const result = await api.post<Cart>('v1/cart/coupon', { code });
        setCart(result);
      },
      removeCoupon: async () => {
        const result = await api.delete<Cart>('v1/cart/coupon');
        setCart(result);
      },
    }),
    [cart, isOpen, refresh],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartSidebar />
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}
