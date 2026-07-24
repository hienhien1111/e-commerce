'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import {
  canAdminCancel,
  nextStatus,
  Order,
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
  reservationStatusLabel,
  statusClass,
} from '@/lib/order';
import { OrderItems, OrderTotals } from './OrderItems';
import styles from './OrderScreens.module.css';
import { useToast } from '@/providers/ToastProvider';

function AdminOrderDetailContent({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const load = useCallback(async () => {
    try {
      setOrder(await api.get<Order>(`v1/admin/orders/${orderId}`));
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : 'Không thể tải đơn hàng.',
      );
    }
  }, [orderId]);
  useEffect(() => {
    void load();
  }, [load]);
  const run = async (url: string, body?: unknown) => {
    setBusy(true);
    setError(null);
    try {
      await (body ? api.patch(url, body) : api.post(url));
      await load();
      toast.success('Đã cập nhật đơn hàng.');
    } catch (cause) {
      const message =
        cause instanceof ApiError ? cause.message : 'Thao tác thất bại.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };
  if (error && !order)
    return (
      <main className={styles.page}>
        <div className="container">
          <p className={styles.error}>{error}</p>
          <Link href="/admin/orders">Quay lại</Link>
        </div>
      </main>
    );
  if (!order)
    return (
      <main className={styles.page}>
        <div className="container">
          <div className="skeleton" style={{ height: 400 }} />
        </div>
      </main>
    );
  const following = nextStatus[order.status];
  const timeline = [
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
  ] as const;
  const currentTimelineIndex = timeline.indexOf(
    order.status === 'CANCELLED' ? 'PENDING' : order.status,
  );
  return (
    <main className={styles.page}>
      <div className="container">
        <h1>Xử lý đơn #{order.id.slice(-8).toUpperCase()}</h1>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.grid}>
          <section className={`card ${styles.card}`}>
            <div className={styles.orderTop}>
              <h2>Sản phẩm</h2>
              <span className={statusClass(order.status)}>
                {orderStatusLabel[order.status]}
              </span>
            </div>
            <div className={styles.adminInfo}>
              <span>
                Khách:{' '}
                <strong>
                  {[order.customer?.lastName, order.customer?.firstName]
                    .filter(Boolean)
                    .join(' ') ||
                    order.customer?.email ||
                    order.userId}
                </strong>
              </span>
              <span>
                Thanh toán:{' '}
                <strong>
                  {paymentMethodLabel[order.paymentMethod]} ·{' '}
                  {paymentStatusLabel[order.paymentStatus]}
                </strong>
              </span>
            </div>
            <ol
              className={styles.detailTimeline}
              aria-label="Tiến trình đơn hàng"
            >
              {timeline.map((item, index) => (
                <li
                  className={
                    order.status !== 'CANCELLED' &&
                    index <= currentTimelineIndex
                      ? styles.timelineComplete
                      : ''
                  }
                  key={item}
                >
                  <i aria-hidden="true" />
                  <span>{orderStatusLabel[item]}</span>
                </li>
              ))}
              {order.status === 'CANCELLED' && (
                <li className={styles.timelineCancelled}>
                  <i aria-hidden="true" />
                  <span>Đã hủy</span>
                </li>
              )}
            </ol>
            <OrderItems order={order} />
          </section>
          <aside className={`card ${styles.card} ${styles.stickyActionPanel}`}>
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
            <OrderTotals order={order} />
            <section className={styles.paymentPanel}>
              <h2>Thanh toán & giữ hàng</h2>
              <dl>
                <div>
                  <dt>Trạng thái thanh toán</dt>
                  <dd>{paymentStatusLabel[order.paymentStatus]}</dd>
                </div>
                <div>
                  <dt>Reservation</dt>
                  <dd>{reservationStatusLabel[order.reservationStatus]}</dd>
                </div>
                <div>
                  <dt>Đã thu lúc</dt>
                  <dd>
                    {order.paidAt
                      ? new Intl.DateTimeFormat('vi-VN', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        }).format(new Date(order.paidAt))
                      : 'Chưa thu'}
                  </dd>
                </div>
              </dl>
              {order.cancellationReason && (
                <p className={styles.notice}>
                  Lý do hủy: {order.cancellationReason}
                </p>
              )}
            </section>
            <div className={styles.actions}>
              {following && (
                <button
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() =>
                    void run(`v1/admin/orders/${order.id}/status`, {
                      status: following,
                    })
                  }
                  type="button"
                >
                  Chuyển sang “{orderStatusLabel[following]}”
                </button>
              )}
              {canAdminCancel(order) && (
                <button
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm('Hủy đơn hàng này?'))
                      void run(`v1/admin/orders/${order.id}/cancel`);
                  }}
                  type="button"
                >
                  Hủy đơn
                </button>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export function AdminOrderDetailScreen({ orderId }: { orderId: string }) {
  return <AdminOrderDetailContent orderId={orderId} />;
}
