'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import type { AdminDashboard } from '@/lib/admin';
import { formatVnd } from '@/lib/catalog';
import { orderStatusLabel, statusClass } from '@/lib/order';
import styles from './AdminScreens.module.css';

export function AdminDashboardScreen() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get<AdminDashboard>('v1/admin/stats')
      .then(setData)
      .catch((cause) =>
        setError(
          cause instanceof ApiError
            ? cause.message
            : 'Không thể tải dashboard.',
        ),
      );
  }, []);

  return (
    <main className={styles.page}>
      <div className="container">
        <div className={styles.heading}>
          <div>
            <h1>Dashboard</h1>
            <p className={styles.muted}>Tổng quan vận hành cửa hàng.</p>
          </div>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        {!data ? (
          <div className="skeleton" style={{ height: 190 }} />
        ) : (
          <>
            <section className={styles.stats}>
              <article className={`card ${styles.stat}`}>
                <span>Sản phẩm</span>
                <strong>{data.totalProducts}</strong>
              </article>
              <article className={`card ${styles.stat}`}>
                <span>Đơn hàng</span>
                <strong>{data.totalOrders}</strong>
              </article>
              <article className={`card ${styles.stat}`}>
                <span>Doanh thu hôm nay</span>
                <strong>{formatVnd(data.revenueToday)}</strong>
              </article>
              <article className={`card ${styles.stat}`}>
                <span>Đơn chờ xử lý</span>
                <strong>{data.pendingOrders}</strong>
              </article>
            </section>
            <section className={`card ${styles.panel}`}>
              <h2>5 đơn gần nhất</h2>
              <div className={styles.recent}>
                {data.recentOrders.length === 0 ? (
                  <p className={styles.empty}>Chưa có đơn hàng.</p>
                ) : (
                  data.recentOrders.map((order) => (
                    <Link href={`/admin/orders/${order.id}`} key={order.id}>
                      <span>
                        #{order.id.slice(-8).toUpperCase()} ·{' '}
                        {order.customer?.email ?? order.userId}
                      </span>
                      <span>
                        <b>{formatVnd(order.total)}</b> ·{' '}
                        <i className={statusClass(order.status)}>
                          {orderStatusLabel[order.status]}
                        </i>
                      </span>
                    </Link>
                  ))
                )}
              </div>
              <p className={styles.muted}>
                Tổng doanh thu chưa hủy: {formatVnd(data.totalRevenue)} ·{' '}
                {data.totalUsers} khách hàng.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
