'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { ApiError, api } from '@/lib/api';
import {
  canCustomerCancel,
  Order,
  OrderStatus,
  orderStatusLabel,
  paymentMethodLabel,
  statusClass,
} from '@/lib/order';
import { OrderItems, OrderTotals } from './OrderItems';
import styles from './OrderScreens.module.css';

const timeline: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
];

function OrderDetailContent({ orderId }: { orderId: string }) {
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setOrder(await api.get<Order>(`v1/orders/${orderId}`));
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : 'Không thể tải đơn hàng.',
      );
    }
  }, [orderId]);
  useEffect(() => {
    void load();
  }, [load]);
  const cancel = async () => {
    if (!order || !window.confirm('Hủy đơn hàng này?')) return;
    try {
      await api.post(`v1/orders/${order.id}/cancel`);
      await load();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : 'Không thể hủy đơn hàng.',
      );
    }
  };

  if (error)
    return (
      <main className={styles.page}>
        <div className="container">
          <p className={styles.error}>{error}</p>
          <Link href="/orders">Quay lại đơn hàng</Link>
        </div>
      </main>
    );
  if (!order)
    return (
      <main className={styles.page}>
        <div className="container">
          <div className="skeleton" style={{ height: 420 }} />
        </div>
      </main>
    );
  const activeIndex = timeline.indexOf(order.status);
  return (
    <main className={styles.page}>
      <div className="container">
        <h1>Đơn #{order.id.slice(-8).toUpperCase()}</h1>
        {searchParams.get('payment') === 'success' && (
          <p className={styles.paymentSuccess}>
            Thanh toán MoMo đã được xác nhận.
          </p>
        )}
        <div className={styles.grid}>
          <section className={`card ${styles.card}`}>
            <div className={styles.orderTop}>
              <h2>Trạng thái đơn hàng</h2>
              <span className={statusClass(order.status)}>
                {orderStatusLabel[order.status]}
              </span>
            </div>
            {order.status !== 'CANCELLED' && (
              <ol className={styles.timeline}>
                {timeline.map((status, index) => (
                  <li
                    className={index <= activeIndex ? styles.active : ''}
                    key={status}
                  >
                    {orderStatusLabel[status]}
                  </li>
                ))}
              </ol>
            )}
            <h2 style={{ marginTop: 24 }}>Sản phẩm</h2>
            <OrderItems order={order} />
          </section>
          <aside className={`card ${styles.card}`}>
            <h2>Giao hàng</h2>
            <address className={styles.address}>
              <strong>{order.shippingAddress.fullName}</strong>
              <span>{order.shippingAddress.phone}</span>
              <span>
                {order.shippingAddress.addressLine},{' '}
                {order.shippingAddress.ward}
              </span>
              <span>
                {order.shippingAddress.district}, {order.shippingAddress.city}
              </span>
            </address>
            <h2 style={{ marginTop: 24 }}>Thanh toán</h2>
            <p className={styles.muted}>
              {paymentMethodLabel[order.paymentMethod]} ·{' '}
              {order.paymentMethod === 'COD' &&
              order.paymentStatus === 'PENDING'
                ? 'Thanh toán khi nhận hàng.'
                : order.paymentStatus === 'PENDING'
                  ? 'Chưa thanh toán.'
                  : `Trạng thái: ${order.paymentStatus}`}
            </p>
            {order.status !== 'CANCELLED' &&
              order.paymentMethod === 'MOMO' &&
              order.paymentStatus === 'PENDING' && (
                <div className={styles.actions}>
                  <Link
                    className="btn btn-primary"
                    href={`/orders/${order.id}/payment`}
                  >
                    Thanh toán MoMo
                  </Link>
                </div>
              )}
            <OrderTotals order={order} />
            {canCustomerCancel(order) && (
              <div className={styles.actions}>
                <button
                  className="btn btn-ghost"
                  onClick={() => void cancel()}
                  type="button"
                >
                  Hủy đơn hàng
                </button>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

export function OrderDetailScreen({ orderId }: { orderId: string }) {
  return (
    <Suspense
      fallback={<main className={styles.page}>Đang tải đơn hàng…</main>}
    >
      <AuthGuard>
        <OrderDetailContent orderId={orderId} />
      </AuthGuard>
    </Suspense>
  );
}
