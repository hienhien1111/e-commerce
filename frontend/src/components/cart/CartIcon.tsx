'use client';

import { useCart } from '@/providers/CartProvider';
import styles from './CartIcon.module.css';

export function CartIcon() {
  const { cart, setOpen } = useCart();
  return (
    <button
      aria-label="Mở giỏ hàng"
      className={styles.button}
      onClick={() => setOpen(true)}
      type="button"
    >
      <span aria-hidden="true">🛒</span>
      <span className={styles.label}>Giỏ hàng</span>
      {cart.itemCount > 0 && (
        <span className={styles.badge}>{cart.itemCount}</span>
      )}
    </button>
  );
}
