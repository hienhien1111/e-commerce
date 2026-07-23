'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api';
import { availabilityMessage, couponReasonMessage } from '@/lib/cart';
import { formatVnd } from '@/lib/catalog';
import { useCart } from '@/providers/CartProvider';
import styles from './CartSidebar.module.css';

export function CartSidebar() {
  const {
    cart,
    isOpen,
    setOpen,
    updateItem,
    removeItem,
    clear,
    applyCoupon,
    removeCoupon,
  } = useCart();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Không thể cập nhật giỏ hàng.',
      );
    } finally {
      setBusy(null);
    }
  };

  const submitCoupon = (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return;
    void run('coupon', async () => {
      await applyCoupon(code.trim());
      setCode('');
    });
  };

  return (
    <div className={styles.layer} role="presentation">
      <button
        aria-label="Đóng giỏ hàng"
        className={styles.backdrop}
        onClick={() => setOpen(false)}
        type="button"
      />
      <aside
        aria-label="Giỏ hàng"
        className={styles.sidebar}
        role="dialog"
        aria-modal="true"
      >
        <header className={styles.header}>
          <h2>Giỏ hàng ({cart.itemCount})</h2>
          <button
            aria-label="Đóng"
            className={styles.close}
            onClick={() => setOpen(false)}
            type="button"
          >
            ×
          </button>
        </header>
        {error && <p className={styles.error}>{error}</p>}
        {cart.items.length === 0 ? (
          <div className={styles.empty}>Giỏ hàng của bạn đang trống.</div>
        ) : (
          <>
            <ul className={styles.items}>
              {cart.items.map((item) => (
                <li key={item.id} className={styles.item}>
                  <div className={styles.image}>
                    {item.product.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt="" src={item.product.thumbnailUrl} />
                    ) : (
                      <span aria-hidden="true">🛍️</span>
                    )}
                  </div>
                  <div className={styles.itemInfo}>
                    <strong>{item.product.name}</strong>
                    <span className={styles.price}>
                      {formatVnd(item.product.price)}
                    </span>
                    {!item.isAvailable && item.availabilityReason && (
                      <span className={styles.warning}>
                        {availabilityMessage[item.availabilityReason]}
                      </span>
                    )}
                    <div className={styles.itemActions}>
                      <div className={styles.stepper}>
                        <button
                          disabled={busy !== null || item.quantity <= 1}
                          onClick={() =>
                            void run(item.id, () =>
                              updateItem(item.productId, item.quantity - 1),
                            )
                          }
                          type="button"
                        >
                          −
                        </button>
                        <output>{item.quantity}</output>
                        <button
                          disabled={
                            busy !== null ||
                            !item.isAvailable ||
                            item.quantity >= item.product.stock
                          }
                          onClick={() =>
                            void run(item.id, () =>
                              updateItem(item.productId, item.quantity + 1),
                            )
                          }
                          type="button"
                        >
                          +
                        </button>
                      </div>
                      <button
                        className={styles.remove}
                        disabled={busy !== null}
                        onClick={() =>
                          void run(item.id, () => removeItem(item.productId))
                        }
                        type="button"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <form className={styles.coupon} onSubmit={submitCoupon}>
              <label htmlFor="cart-coupon">Mã giảm giá</label>
              {cart.coupon ? (
                <div
                  className={
                    cart.coupon.isValid
                      ? styles.couponApplied
                      : styles.couponInvalid
                  }
                >
                  <span>
                    {cart.coupon.code}:{' '}
                    {cart.coupon.isValid
                      ? `giảm ${formatVnd(cart.coupon.discountAmount)}`
                      : (couponReasonMessage[cart.coupon.reason ?? ''] ??
                        'Mã không hợp lệ.')}
                  </span>
                  <button
                    disabled={busy !== null}
                    onClick={() => void run('coupon', removeCoupon)}
                    type="button"
                  >
                    Bỏ
                  </button>
                </div>
              ) : (
                <div className={styles.couponInput}>
                  <input
                    id="cart-coupon"
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="Nhập mã"
                    value={code}
                  />
                  <button
                    className="btn btn-outline"
                    disabled={busy !== null || !code.trim()}
                    type="submit"
                  >
                    Áp dụng
                  </button>
                </div>
              )}
            </form>
            <dl className={styles.totals}>
              <div>
                <dt>Tạm tính</dt>
                <dd>{formatVnd(cart.subtotal)}</dd>
              </div>
              <div>
                <dt>Giảm giá</dt>
                <dd>−{formatVnd(cart.discountAmount)}</dd>
              </div>
              <div className={styles.total}>
                <dt>Tổng tiền</dt>
                <dd>{formatVnd(cart.total)}</dd>
              </div>
            </dl>
            {!cart.checkoutReady && (
              <p className={styles.checkoutWarning}>
                Hãy xử lý các sản phẩm không còn khả dụng trước khi mua hàng.
              </p>
            )}
            <div className={styles.footer}>
              <button
                className="btn btn-ghost"
                disabled={busy !== null}
                onClick={() => void run('clear', clear)}
                type="button"
              >
                Xóa giỏ
              </button>
              <button
                className="btn btn-primary"
                disabled={busy !== null || !cart.checkoutReady}
                onClick={() => {
                  setOpen(false);
                  router.push('/checkout');
                }}
                type="button"
              >
                Mua hàng
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
