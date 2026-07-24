'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { formatVnd } from '@/lib/catalog';
import {
  Order,
  OrderPage,
  OrderStats,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ReservationStatus,
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
  reservationStatusLabel,
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
const paymentStatuses: Array<PaymentStatus | 'ALL'> = [
  'ALL',
  'PENDING',
  'PAID',
  'FAILED',
  'REFUND_PENDING',
  'REFUND_FAILED',
  'REFUNDED',
];
const reservationStatuses: Array<ReservationStatus | 'ALL'> = [
  'ALL',
  'PENDING',
  'RESERVED',
  'FAILED',
  'RELEASE_PENDING',
  'RELEASED',
];

function shortId(id: string) {
  return `#${id.slice(-8).toUpperCase()}`;
}

function customerName(order: Order) {
  return (
    [order.customer?.lastName, order.customer?.firstName]
      .filter(Boolean)
      .join(' ') ||
    order.customer?.email ||
    order.shippingAddress.fullName
  );
}

function initialParam(name: string) {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(name) ?? '';
}

function AdminOrdersContent() {
  const [status, setStatus] = useState<OrderStatus | 'ALL'>(
    () => (initialParam('status') as OrderStatus) || 'ALL',
  );
  const [search, setSearch] = useState(() => initialParam('search'));
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | 'ALL'>(
    () => (initialParam('paymentMethod') as PaymentMethod) || 'ALL',
  );
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | 'ALL'>(
    () => (initialParam('paymentStatus') as PaymentStatus) || 'ALL',
  );
  const [reservationStatus, setReservationStatus] = useState<
    ReservationStatus | 'ALL'
  >(() => (initialParam('reservationStatus') as ReservationStatus) || 'ALL');
  const [from, setFrom] = useState(() => initialParam('from'));
  const [to, setTo] = useState(() => initialParam('to'));
  const [page, setPage] = useState<OrderPage | null>(null);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const query = useCallback(
    (cursor?: string) => {
      const params = new URLSearchParams();
      if (status !== 'ALL') params.set('status', status);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (paymentMethod !== 'ALL') params.set('paymentMethod', paymentMethod);
      if (paymentStatus !== 'ALL') params.set('paymentStatus', paymentStatus);
      if (reservationStatus !== 'ALL')
        params.set('reservationStatus', reservationStatus);
      if (from) params.set('from', new Date(`${from}T00:00:00`).toISOString());
      if (to) params.set('to', new Date(`${to}T23:59:59`).toISOString());
      if (cursor) params.set('cursor', cursor);
      return params;
    },
    [
      status,
      debouncedSearch,
      paymentMethod,
      paymentStatus,
      reservationStatus,
      from,
      to,
    ],
  );

  const load = useCallback(
    async (cursor?: string, append = false) => {
      setLoading(true);
      setError(null);
      try {
        const params = query(cursor);
        const statParams = new URLSearchParams();
        if (from)
          statParams.set('from', new Date(`${from}T00:00:00`).toISOString());
        if (to) statParams.set('to', new Date(`${to}T23:59:59`).toISOString());
        const [orders, summary] = await Promise.all([
          api.get<OrderPage>(`v1/admin/orders?${params.toString()}`),
          api.get<OrderStats>(`v1/admin/orders/stats?${statParams.toString()}`),
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
    [from, query, to],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      350,
    );
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const params = query();
    const target = params.size
      ? `?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState(null, '', target);
  }, [query]);

  const apply = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = search.trim();
    if (trimmed === debouncedSearch) void load();
    else setDebouncedSearch(trimmed);
  };

  return (
    <main className={styles.page}>
      <div className="container">
        <div className={styles.screenHeading}>
          <div>
            <p className={styles.eyebrow}>Fulfillment</p>
            <h1>Quản lý đơn hàng</h1>
            <p className={styles.muted}>
              Tìm kiếm, kiểm tra giữ hàng và xử lý thanh toán tại một nơi.
            </p>
          </div>
          <Link className="btn btn-outline" href="/admin/operations">
            Tác vụ hoàn tiền
          </Link>
        </div>

        {stats && (
          <section className={styles.stats} aria-label="Tổng quan đơn hàng">
            <article className={`card ${styles.stat}`}>
              <span>Doanh thu đã thu</span>
              <strong>{formatVnd(stats.totalRevenue)}</strong>
            </article>
            {(['PENDING', 'PROCESSING', 'SHIPPED', 'CANCELLED'] as const).map(
              (item) => (
                <article className={`card ${styles.stat}`} key={item}>
                  <span>{orderStatusLabel[item]}</span>
                  <strong>{stats.counts[item]}</strong>
                </article>
              ),
            )}
          </section>
        )}

        <div className={styles.quickFilters} aria-label="Lọc nhanh trạng thái">
          {statuses.map((item) => (
            <button
              aria-pressed={status === item}
              className={status === item ? styles.quickFilterActive : ''}
              key={item}
              onClick={() => setStatus(item)}
              type="button"
            >
              {item === 'ALL' ? 'Tất cả' : orderStatusLabel[item]}
            </button>
          ))}
        </div>

        <form className={`card ${styles.filterCard}`} onSubmit={apply}>
          <label className={styles.searchField}>
            <span>Tìm đơn hàng</span>
            <input
              className="form-input"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Mã đơn, email hoặc số điện thoại"
              value={search}
            />
          </label>
          <label>
            <span>Phương thức</span>
            <select
              className="form-input"
              onChange={(event) =>
                setPaymentMethod(event.target.value as PaymentMethod | 'ALL')
              }
              value={paymentMethod}
            >
              <option value="ALL">Tất cả</option>
              <option value="COD">COD</option>
              <option value="MOMO">MoMo</option>
            </select>
          </label>
          <label>
            <span>Thanh toán</span>
            <select
              className="form-input"
              onChange={(event) =>
                setPaymentStatus(event.target.value as PaymentStatus | 'ALL')
              }
              value={paymentStatus}
            >
              {paymentStatuses.map((item) => (
                <option key={item} value={item}>
                  {item === 'ALL' ? 'Tất cả' : paymentStatusLabel[item]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Giữ hàng</span>
            <select
              className="form-input"
              onChange={(event) =>
                setReservationStatus(
                  event.target.value as ReservationStatus | 'ALL',
                )
              }
              value={reservationStatus}
            >
              {reservationStatuses.map((item) => (
                <option key={item} value={item}>
                  {item === 'ALL' ? 'Tất cả' : reservationStatusLabel[item]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Từ ngày</span>
            <input
              className="form-input"
              onChange={(event) => setFrom(event.target.value)}
              type="date"
              value={from}
            />
          </label>
          <label>
            <span>Đến ngày</span>
            <input
              className="form-input"
              onChange={(event) => setTo(event.target.value)}
              type="date"
              value={to}
            />
          </label>
          <button className="btn btn-primary" type="submit">
            Áp dụng
          </button>
        </form>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {loading && !page ? (
          <div className="skeleton" style={{ height: 260 }} />
        ) : page?.data.length === 0 ? (
          <div className={`card ${styles.empty}`}>
            Không tìm thấy đơn hàng phù hợp.
          </div>
        ) : (
          <>
            <div className={styles.adminTableWrap}>
              <table className={styles.adminTable}>
                <thead>
                  <tr>
                    <th>Đơn hàng</th>
                    <th>Khách hàng</th>
                    <th>Fulfillment</th>
                    <th>Giữ hàng</th>
                    <th>Thanh toán</th>
                    <th>Tổng tiền</th>
                    <th aria-label="Thao tác" />
                  </tr>
                </thead>
                <tbody>
                  {page?.data.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <strong>{shortId(order.id)}</strong>
                        <span className={styles.tableMeta}>
                          {new Intl.DateTimeFormat('vi-VN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          }).format(new Date(order.createdAt))}
                        </span>
                      </td>
                      <td>
                        <strong>{customerName(order)}</strong>
                        <span className={styles.tableMeta}>
                          {order.customer?.email ?? order.shippingAddress.phone}
                        </span>
                      </td>
                      <td>
                        <span className={statusClass(order.status)}>
                          {orderStatusLabel[order.status]}
                        </span>
                      </td>
                      <td>
                        <span className={styles.reservationBadge}>
                          {reservationStatusLabel[order.reservationStatus]}
                        </span>
                      </td>
                      <td>
                        <strong>
                          {paymentStatusLabel[order.paymentStatus]}
                        </strong>
                        <span className={styles.tableMeta}>
                          {paymentMethodLabel[order.paymentMethod]}
                        </span>
                      </td>
                      <td>
                        <strong className="price">
                          {formatVnd(order.total)}
                        </strong>
                      </td>
                      <td>
                        <Link
                          className="btn btn-outline"
                          href={`/admin/orders/${order.id}`}
                        >
                          Chi tiết
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.mobileOrders}>
              {page?.data.map((order) => (
                <article className={`card ${styles.order}`} key={order.id}>
                  <div className={styles.orderTop}>
                    <div>
                      <strong>{shortId(order.id)}</strong>
                      <p className={styles.muted}>{customerName(order)}</p>
                    </div>
                    <span className={statusClass(order.status)}>
                      {orderStatusLabel[order.status]}
                    </span>
                  </div>
                  <dl className={styles.mobileOrderMeta}>
                    <div>
                      <dt>Giữ hàng</dt>
                      <dd>{reservationStatusLabel[order.reservationStatus]}</dd>
                    </div>
                    <div>
                      <dt>Thanh toán</dt>
                      <dd>{paymentStatusLabel[order.paymentStatus]}</dd>
                    </div>
                  </dl>
                  <div className={styles.orderBottom}>
                    <strong className="price">{formatVnd(order.total)}</strong>
                    <Link
                      className="btn btn-outline"
                      href={`/admin/orders/${order.id}`}
                    >
                      Chi tiết
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </>
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
  return <AdminOrdersContent />;
}
