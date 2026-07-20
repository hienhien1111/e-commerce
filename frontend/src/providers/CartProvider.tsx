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
import { useToast } from '@/providers/ToastProvider';

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
  const toast = useToast();

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
        try {
          const result = await api.post<Cart>('v1/cart/items', {
            productId,
            quantity,
          });
          setCart(result);
          setOpen(true);
          toast.success('Đã thêm sản phẩm vào giỏ hàng.');
        } catch (error) {
          toast.error('Không thể thêm sản phẩm vào giỏ hàng.');
          throw error;
        }
      },
      updateItem: async (productId, quantity) => {
        try {
          const result = await api.patch<Cart>(`v1/cart/items/${productId}`, {
            quantity,
          });
          setCart(result);
        } catch (error) {
          toast.error('Không thể cập nhật giỏ hàng.');
          throw error;
        }
      },
      removeItem: async (productId) => {
        try {
          await api.delete(`v1/cart/items/${productId}`);
          await refresh();
          toast.success('Đã xoá sản phẩm khỏi giỏ hàng.');
        } catch (error) {
          toast.error('Không thể xoá sản phẩm khỏi giỏ hàng.');
          throw error;
        }
      },
      clear: async () => {
        try {
          await api.delete('v1/cart');
          setCart(emptyCart());
          toast.success('Đã xoá giỏ hàng.');
        } catch (error) {
          toast.error('Không thể xoá giỏ hàng.');
          throw error;
        }
      },
      applyCoupon: async (code) => {
        try {
          const result = await api.post<Cart>('v1/cart/coupon', { code });
          setCart(result);
          toast.success('Đã áp dụng mã giảm giá.');
        } catch (error) {
          toast.error('Không thể áp dụng mã giảm giá.');
          throw error;
        }
      },
      removeCoupon: async () => {
        try {
          const result = await api.delete<Cart>('v1/cart/coupon');
          setCart(result);
          toast.success('Đã gỡ mã giảm giá.');
        } catch (error) {
          toast.error('Không thể gỡ mã giảm giá.');
          throw error;
        }
      },
    }),
    [cart, isOpen, refresh, toast],
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
