'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { ApiError, api } from '@/lib/api';
import { formatVnd } from '@/lib/catalog';
import {
  canCustomerCancel,
  Order,
  OrderPage,
  OrderStatus,
  orderStatusLabel,
  statusClass,
} from '@/lib/order';
import styles from './OrderScreens.module.css';

const statuses: Array<OrderStatus | 'ALL'> = [
  'ALL',
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

function OrdersContent() {
  const [status, setStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [page, setPage] = useState<OrderPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (cursor?: string, append = false) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (status !== 'ALL') params.set('status', status);
        if (cursor) params.set('cursor', cursor);
        const result = await api.get<OrderPage>(
          `v1/orders?${params.toString()}`,
        );
        setPage((current) =>
          append && current
            ? {
                data: [...current.data, ...result.data],
                nextCursor: result.nextCursor,
              }
            : result,
        );
      } catch (cause) {
        setError(
          cause instanceof ApiError ? cause.message : 'Không thể tải đơn hàng.',
        );
      } finally {
        setLoading(false);
      }
    },
    [status],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const cancel = async (order: Order) => {
    if (!window.confirm('Hủy đơn hàng này?')) return;
    try {
      await api.post(`v1/orders/${order.id}/cancel`);
      await load();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : 'Không thể hủy đơn hàng.',
      );
    }
  };

  return (
    <main className={styles.page}>
      <div className="container">
        <h1>Đơn hàng của tôi</h1>
        <div className={styles.tabs}>
          {statuses.map((item) => (
            <button
              className={`${styles.tab} ${status === item ? styles.tabActive : ''}`}
              key={item}
              onClick={() => setStatus(item)}
              type="button"
            >
              {item === 'ALL' ? 'Tất cả' : orderStatusLabel[item]}
            </button>
          ))}
        </div>
        {error && <p className={styles.error}>{error}</p>}
        {loading && !page ? (
          <div className="skeleton" style={{ height: 180 }} />
        ) : page?.data.length === 0 ? (
          <div className={`card ${styles.empty}`}>
            Chưa có đơn hàng phù hợp.
          </div>
        ) : (
          page?.data.map((order) => (
            <article className={`card ${styles.order}`} key={order.id}>
              <div className={styles.orderTop}>
                <div>
                  <strong className={styles.orderName}>
                    Đơn #{order.id.slice(-8).toUpperCase()}
                  </strong>
                  <p className={styles.muted}>
                    {new Date(order.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                <span className={statusClass(order.status)}>
                  {orderStatusLabel[order.status]}
                </span>
              </div>
              <p className={styles.muted}>
                {order.items.length} sản phẩm ·{' '}
                {order.paymentStatus === 'PENDING'
                  ? 'Chưa thanh toán'
                  : `Thanh toán: ${order.paymentStatus}`}
              </p>
              <div className={styles.orderBottom}>
                <strong className="price">{formatVnd(order.total)}</strong>
                <div className={styles.actions}>
                  <Link
                    className="btn btn-outline"
                    href={`/orders/${order.id}`}
                  >
                    Xem chi tiết
                  </Link>
                  {canCustomerCancel(order) && (
                    <button
                      className="btn btn-ghost"
                      onClick={() => void cancel(order)}
                      type="button"
                    >
                      Hủy đơn
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
        {page?.nextCursor && (
          <div className={styles.actions}>
            <button
              className="btn btn-outline"
              disabled={loading}
              onClick={() => void load(page.nextCursor ?? undefined, true)}
              type="button"
            >
              {loading ? 'Đang tải…' : 'Xem thêm'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export function OrdersScreen() {
  return (
    <AuthGuard>
      <OrdersContent />
    </AuthGuard>
  );
}
