'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { ApiError, api } from '@/lib/api';
import { formatVnd } from '@/lib/catalog';
import { Order, ShippingAddress } from '@/lib/order';
import { useCart } from '@/providers/CartProvider';
import { useToast } from '@/providers/ToastProvider';
import styles from './OrderScreens.module.css';

const blankAddress: ShippingAddress = {
  fullName: '',
  phone: '',
  addressLine: '',
  ward: '',
  district: '',
  city: '',
};

function CheckoutContent() {
  const router = useRouter();
  const { cart, refresh, setOpen } = useCart();
  const [address, setAddress] = useState<ShippingAddress>(blankAddress);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const order = await api.post<Order>('v1/orders', {
        shippingAddress: address,
      });
      await refresh();
      setOpen(false);
      toast.success('Đặt hàng thành công.');
      router.replace(`/orders/${order.id}`);
    } catch (cause) {
      const message =
        cause instanceof ApiError ? cause.message : 'Không thể đặt hàng.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  if (cart.items.length === 0 || !cart.checkoutReady) {
    return (
      <main className={styles.page}>
        <div className={`container ${styles.card}`}>
          <h1>Thanh toán</h1>
          <p>Giỏ hàng trống hoặc có sản phẩm chưa khả dụng.</p>
          <div className={styles.actions}>
            <button
              className="btn btn-primary"
              onClick={() => {
                setOpen(true);
                router.push('/');
              }}
              type="button"
            >
              Quay lại giỏ hàng
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className="container">
        <h1>Thanh toán</h1>
        <form className={styles.grid} onSubmit={submit}>
          <section className={`card ${styles.card}`}>
            <h2>Địa chỉ nhận hàng</h2>
            {error && <p className={styles.error}>{error}</p>}
            {(
              [
                ['fullName', 'Họ và tên'],
                ['phone', 'Số điện thoại'],
                ['addressLine', 'Địa chỉ'],
                ['ward', 'Phường/Xã'],
                ['district', 'Quận/Huyện'],
                ['city', 'Tỉnh/Thành phố'],
              ] as const
            ).map(([key, label]) => (
              <label className="form-group" key={key}>
                <span className="form-label">{label}</span>
                <input
                  className="form-input"
                  onChange={(event) =>
                    setAddress((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  required
                  value={address[key]}
                />
              </label>
            ))}
          </section>
          <aside className={`card ${styles.card}`}>
            <h2>Đơn hàng</h2>
            {cart.items.map((item) => (
              <div className={styles.item} key={item.id}>
                <span>
                  {item.product.name} × {item.quantity}
                </span>
                <strong>{formatVnd(item.product.price * item.quantity)}</strong>
              </div>
            ))}
            <dl className={styles.totals}>
              <div>
                <dt>Tạm tính</dt>
                <dd>{formatVnd(cart.subtotal)}</dd>
              </div>
              <div>
                <dt>Giảm giá{cart.coupon ? ` (${cart.coupon.code})` : ''}</dt>
                <dd>−{formatVnd(cart.discountAmount)}</dd>
              </div>
              <div className={styles.grand}>
                <dt>Tổng</dt>
                <dd>{formatVnd(cart.total)}</dd>
              </div>
            </dl>
            <button className="btn btn-primary" disabled={busy} type="submit">
              {busy ? 'Đang đặt hàng…' : 'Đặt hàng'}
            </button>
          </aside>
        </form>
      </div>
    </main>
  );
}

export function CheckoutScreen() {
  return (
    <AuthGuard>
      <CheckoutContent />
    </AuthGuard>
  );
}
