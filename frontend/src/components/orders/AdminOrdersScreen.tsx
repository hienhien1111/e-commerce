'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { ApiError, api } from '@/lib/api';
import { formatVnd } from '@/lib/catalog';
import {
  Order,
  OrderPage,
  OrderStats,
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

function AdminOrdersContent() {
  const [status, setStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [userId, setUserId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState<OrderPage | null>(null);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const query = useCallback(
    (cursor?: string) => {
      const params = new URLSearchParams();
      if (status !== 'ALL') params.set('status', status);
      if (userId) params.set('userId', userId);
      if (from) params.set('from', new Date(`${from}T00:00:00`).toISOString());
      if (to) params.set('to', new Date(`${to}T23:59:59`).toISOString());
      if (cursor) params.set('cursor', cursor);
      return params;
    },
    [status, userId, from, to],
  );
  const load = useCallback(
    async (cursor?: string, append = false) => {
      setLoading(true);
      setError(null);
      const params = query(cursor);
      try {
        const [orders, summary] = await Promise.all([
          api.get<OrderPage>(`v1/admin/orders?${params.toString()}`),
          api.get<OrderStats>(`v1/admin/orders/stats?${params.toString()}`),
        ]);
        setPage((current) =>
          append && current
            ? {
                data: [...current.data, ...orders.data],
                nextCursor: orders.nextCursor,
              }
            : orders,
        );
        setStats(summary);
      } catch (cause) {
        setError(
          cause instanceof ApiError ? cause.message : 'Không thể tải đơn hàng.',
        );
      } finally {
        setLoading(false);
      }
    },
    [query],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const apply = (event: FormEvent) => {
    event.preventDefault();
    void load();
  };

  return (
    <main className={styles.page}>
      <div className="container">
        <h1>Quản lý đơn hàng</h1>
        {stats && (
          <section className={styles.stats}>
            <article className={`card ${styles.stat}`}>
              <span>Doanh thu (chưa hủy)</span>
              <strong>{formatVnd(stats.totalRevenue)}</strong>
            </article>
            {statuses
              .filter((item): item is OrderStatus => item !== 'ALL')
              .map((item) => (
                <article className={`card ${styles.stat}`} key={item}>
                  <span>{orderStatusLabel[item]}</span>
                  <strong>{stats.counts[item]}</strong>
                </article>
              ))}
          </section>
        )}
        <form className={`card ${styles.card}`} onSubmit={apply}>
          <div className={styles.filters}>
            <select
              className="form-input"
              onChange={(event) =>
                setStatus(event.target.value as OrderStatus | 'ALL')
              }
              value={status}
            >
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item === 'ALL'
                    ? 'Tất cả trạng thái'
                    : orderStatusLabel[item]}
                </option>
              ))}
            </select>
            <input
              className="form-input"
              onChange={(event) => setUserId(event.target.value)}
              placeholder="User ID"
              value={userId}
            />
            <input
              className="form-input"
              onChange={(event) => setFrom(event.target.value)}
              type="date"
              value={from}
            />
            <input
              className="form-input"
              onChange={(event) => setTo(event.target.value)}
              type="date"
              value={to}
            />
            <button className="btn btn-primary" type="submit">
              Lọc
            </button>
          </div>
        </form>
        {error && <p className={styles.error}>{error}</p>}
        {loading && !page ? (
          <div className="skeleton" style={{ height: 180 }} />
        ) : page?.data.length === 0 ? (
          <div className={`card ${styles.empty}`}>Không có đơn hàng.</div>
        ) : (
          page?.data.map((order) => (
            <article className={`card ${styles.order}`} key={order.id}>
              <div className={styles.orderTop}>
                <div>
                  <strong>#{order.id.slice(-8).toUpperCase()}</strong>
                  <p className={styles.muted}>
                    {order.customer?.email ?? order.userId}
                  </p>
                </div>
                <span className={statusClass(order.status)}>
                  {orderStatusLabel[order.status]}
                </span>
              </div>
              <div className={styles.orderBottom}>
                <strong className="price">{formatVnd(order.total)}</strong>
                <Link
                  className="btn btn-outline"
                  href={`/admin/orders/${order.id}`}
                >
                  Xử lý đơn
                </Link>
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

export function AdminOrdersScreen() {
  return (
    <AuthGuard requireAdmin>
      <AdminOrdersContent />
    </AuthGuard>
  );
}
