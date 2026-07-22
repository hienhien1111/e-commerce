'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { ApiError, api } from '@/lib/api';
import { couponReasonMessage } from '@/lib/cart';
import { formatVnd, Product } from '@/lib/catalog';
import {
  Order,
  PaymentMethod,
  ShippingAddress,
  paymentMethodLabel,
} from '@/lib/order';
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

type CouponValidation = {
  valid: boolean;
  discountAmount: number;
  reason?: string;
};

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cart, refresh, setOpen } = useCart();
  const directProductId = searchParams.get('productId');
  const directVariantId = searchParams.get('variantId');
  const requestedQuantity = Number(searchParams.get('quantity') ?? 1);
  const directQuantity =
    Number.isInteger(requestedQuantity) && requestedQuantity > 0
      ? requestedQuantity
      : 1;
  const direct = Boolean(directProductId || directVariantId);
  const [product, setProduct] = useState<Product | null>(null);
  const [productError, setProductError] = useState<string | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(direct);
  const [address, setAddress] = useState<ShippingAddress>(blankAddress);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<CouponValidation | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (!direct) {
      setLoadingProduct(false);
      void refresh().catch(() => undefined);
      return;
    }
    let active = true;
    setLoadingProduct(true);
    void api
      .get<Product>(
        `v1/products/${directProductId ?? searchParams.get('productId') ?? ''}`,
        { skipAuth: true },
      )
      .then((result) => {
        if (!active) return;
        setProduct(result);
        setProductError(null);
      })
      .catch(() => active && setProductError('Sản phẩm không còn khả dụng.'))
      .finally(() => active && setLoadingProduct(false));
    return () => {
      active = false;
    };
  }, [direct, directProductId, refresh, searchParams]);

  const directVariant =
    product?.variants.find((variant) => variant.id === directVariantId) ??
    product?.variants.find((variant) => variant.label === null) ??
    null;

  const directSubtotal =
    directVariant && Number.isInteger(directQuantity)
      ? directVariant.price * directQuantity
      : 0;
  const directDiscount = coupon?.valid ? coupon.discountAmount : 0;
  const items = useMemo(
    () =>
      direct
        ? product
          ? [
              {
                id: directVariant?.id ?? product.id,
                name: product.name,
                quantity: directQuantity,
                price: directVariant?.price ?? product.price,
              },
            ]
          : []
        : cart.items.map((item) => ({
            id: item.id,
            name: item.product.name,
            quantity: item.quantity,
            price: item.product.price,
          })),
    [cart.items, direct, directQuantity, directVariant, product],
  );
  const subtotal = direct ? directSubtotal : cart.subtotal;
  const discountAmount = direct ? directDiscount : cart.discountAmount;
  const total = subtotal - discountAmount;
  const checkoutReady = direct
    ? Boolean(
        directVariant &&
          directVariant.isActive &&
          directVariant.stock >= directQuantity &&
          directQuantity > 0,
      )
    : cart.checkoutReady;

  const applyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    setCouponError(null);
    setCoupon(null);
    if (!code) return;
    try {
      const result = await api.get<CouponValidation>(
        `v1/coupons/validate?code=${encodeURIComponent(code)}&total=${subtotal}`,
        { skipAuth: true },
      );
      setCoupon(result);
      if (!result.valid) {
        setCouponError(
          couponReasonMessage[result.reason ?? ''] ??
            'Mã giảm giá chưa áp dụng được.',
        );
      }
    } catch {
      setCouponError('Không thể kiểm tra mã giảm giá.');
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (direct && couponCode.trim() && !coupon?.valid) {
      const message = 'Hãy áp dụng mã giảm giá hợp lệ trước khi đặt hàng.';
      setError(message);
      toast.error(message);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const order = direct
        ? await api.post<Order>('v1/orders/buy-now', {
            productId: directProductId ?? undefined,
            variantId: directVariantId ?? directVariant?.id,
            quantity: directQuantity,
            couponCode: coupon?.valid
              ? couponCode.trim().toUpperCase()
              : undefined,
            shippingAddress: address,
            paymentMethod,
          })
        : await api.post<Order>('v1/orders', {
            shippingAddress: address,
            paymentMethod,
          });
      if (!direct) {
        await refresh();
        setOpen(false);
      }
      toast.success('Đặt hàng thành công.');
      router.replace(
        paymentMethod === 'MOMO'
          ? `/orders/${order.id}/payment`
          : `/orders/${order.id}`,
      );
    } catch (cause) {
      const message =
        cause instanceof ApiError ? cause.message : 'Không thể đặt hàng.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  if (direct && loadingProduct) {
    return (
      <main className={styles.page}>
        <div className={`container ${styles.card}`}>
          <div className="skeleton" style={{ height: 300 }} />
        </div>
      </main>
    );
  }

  if (productError || !checkoutReady) {
    return (
      <main className={styles.page}>
        <div className={`container ${styles.card}`}>
          <h1>Thanh toán</h1>
          <p>
            {productError ?? 'Giỏ hàng trống hoặc có sản phẩm chưa khả dụng.'}
          </p>
          <div className={styles.actions}>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (direct) router.push('/');
                else {
                  setOpen(true);
                  router.push('/');
                }
              }}
              type="button"
            >
              Quay lại mua sắm
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className="container">
        <h1>{direct ? 'Mua ngay' : 'Thanh toán'}</h1>
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
            <h2 style={{ marginTop: 24 }}>Phương thức thanh toán</h2>
            {(Object.keys(paymentMethodLabel) as PaymentMethod[]).map(
              (method) => (
                <label className={styles.paymentMethod} key={method}>
                  <input
                    checked={paymentMethod === method}
                    name="paymentMethod"
                    onChange={() => setPaymentMethod(method)}
                    type="radio"
                    value={method}
                  />
                  <span>
                    <strong>{paymentMethodLabel[method]}</strong>
                    <small>
                      {method === 'COD'
                        ? 'Thanh toán cho nhân viên giao hàng.'
                        : 'Thanh toán an toàn qua ví MoMo sau khi đặt hàng.'}
                    </small>
                  </span>
                </label>
              ),
            )}
          </section>
          <aside className={`card ${styles.card}`}>
            <h2>Đơn hàng</h2>
            {items.map((item) => (
              <div className={styles.item} key={item.id}>
                <span>
                  {item.name} × {item.quantity}
                </span>
                <strong>{formatVnd(item.price * item.quantity)}</strong>
              </div>
            ))}
            {direct && (
              <div className={styles.couponBox}>
                <label className="form-label" htmlFor="buy-now-coupon">
                  Mã giảm giá
                </label>
                <div className={styles.actions}>
                  <input
                    id="buy-now-coupon"
                    className="form-input"
                    onChange={(event) => {
                      setCouponCode(event.target.value);
                      setCoupon(null);
                      setCouponError(null);
                    }}
                    placeholder="Nhập mã"
                    value={couponCode}
                  />
                  <button
                    className="btn btn-outline"
                    onClick={() => void applyCoupon()}
                    type="button"
                  >
                    Áp dụng
                  </button>
                </div>
                {couponError && <p className={styles.error}>{couponError}</p>}
                {coupon?.valid && (
                  <p className={styles.notice}>
                    Đã áp dụng mã {couponCode.trim().toUpperCase()}.
                  </p>
                )}
              </div>
            )}
            <dl className={styles.totals}>
              <div>
                <dt>Tạm tính</dt>
                <dd>{formatVnd(subtotal)}</dd>
              </div>
              <div>
                <dt>
                  Giảm giá
                  {!direct && cart.coupon ? ` (${cart.coupon.code})` : ''}
                </dt>
                <dd>−{formatVnd(discountAmount)}</dd>
              </div>
              <div className={styles.grand}>
                <dt>Tổng</dt>
                <dd>{formatVnd(total)}</dd>
              </div>
            </dl>
            <button className="btn btn-primary" disabled={busy} type="submit">
              {busy
                ? 'Đang đặt hàng…'
                : paymentMethod === 'MOMO'
                  ? 'Đặt hàng và thanh toán MoMo'
                  : 'Đặt hàng'}
            </button>
          </aside>
        </form>
      </div>
    </main>
  );
}

export function CheckoutScreen() {
  return (
    <Suspense
      fallback={<main className={styles.page}>Đang tải thanh toán…</main>}
    >
      <AuthGuard>
        <CheckoutContent />
      </AuthGuard>
    </Suspense>
  );
}
