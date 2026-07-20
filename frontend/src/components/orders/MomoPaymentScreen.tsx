'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import AuthGuard from '@/components/AuthGuard';
import { ApiError, api } from '@/lib/api';
import { formatVnd } from '@/lib/catalog';
import type { Payment } from '@/lib/payment';
import styles from './OrderScreens.module.css';

function formatRemaining(expiresAt: string | null, now: number): string | null {
  if (!expiresAt) return null;
  const remaining = new Date(expiresAt).getTime() - now;
  if (remaining <= 0) return 'Đã hết hạn';
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1_000);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function MomoPaymentContent({ orderId }: { orderId: string }) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  const initiate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPayment(
        await api.post<Payment>('v1/payments/initiate', { orderId }),
      );
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Không thể tạo phiên thanh toán MoMo.',
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const poll = useCallback(async () => {
    try {
      const updated = await api.get<Payment>(`v1/payments/order/${orderId}`);
      setPayment(updated);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 404) return;
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Không thể kiểm tra trạng thái thanh toán.',
      );
    }
  }, [orderId]);

  useEffect(() => {
    void initiate();
  }, [initiate]);

  useEffect(() => {
    if (payment?.status !== 'PENDING') return;
    const interval = window.setInterval(() => void poll(), 3_000);
    return () => window.clearInterval(interval);
  }, [payment?.status, poll]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const remaining = formatRemaining(payment?.expiresAt ?? null, now);
  const expired = remaining === 'Đã hết hạn';

  return (
    <main className={styles.page}>
      <div className={`container ${styles.paymentPage}`}>
        <Link href={`/orders/${orderId}`} className={styles.backLink}>
          ← Quay lại đơn hàng
        </Link>
        <section className={`card ${styles.paymentCard}`}>
          <h1>Thanh toán MoMo</h1>
          <p className={styles.muted}>
            Trạng thái thanh toán được xác nhận tự động sau khi MoMo gửi kết
            quả đến hệ thống.
          </p>
          {loading && <div className="skeleton" style={{ height: 360 }} />}
          {!loading && error && <p className={styles.error}>{error}</p>}
          {!loading && payment?.status === 'PAID' && (
            <div className={styles.paymentSuccess}>
              <h2>Thanh toán thành công</h2>
              <p>Đơn hàng đã được MoMo xác nhận.</p>
              <Link className="btn btn-primary" href={`/orders/${orderId}?payment=success`}>
                Xem đơn hàng
              </Link>
            </div>
          )}
          {!loading && payment?.status === 'PENDING' && !expired && (
            <div className={styles.paymentSession}>
              <strong className={styles.paymentAmount}>
                {formatVnd(payment.amount)}
              </strong>
              {payment.qrCodeUrl ? (
                <div className={styles.qr}>
                  <QRCodeSVG value={payment.qrCodeUrl} size={220} />
                </div>
              ) : (
                <p className={styles.notice}>Không có mã QR, hãy dùng liên kết bên dưới.</p>
              )}
              <p className={styles.countdown}>Phiên còn hiệu lực: {remaining}</p>
              <div className={styles.actions}>
                {payment.deeplink && (
                  <a className="btn btn-primary" href={payment.deeplink}>
                    Mở ứng dụng MoMo
                  </a>
                )}
                {payment.payUrl && (
                  <a className="btn btn-ghost" href={payment.payUrl}>
                    Mở trang thanh toán
                  </a>
                )}
              </div>
              <p className={styles.muted}>Đang kiểm tra trạng thái mỗi 3 giây…</p>
            </div>
          )}
          {!loading && (expired || payment?.status === 'FAILED' || error) && (
            <div className={styles.paymentRetry}>
              <p className={styles.notice}>
                {expired
                  ? 'Phiên thanh toán đã hết hạn.'
                  : 'Phiên thanh toán không thành công. Bạn có thể thử lại.'}
              </p>
              <button className="btn btn-primary" type="button" onClick={() => void initiate()}>
                Thử lại
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export function MomoPaymentScreen({ orderId }: { orderId: string }) {
  return (
    <AuthGuard>
      <MomoPaymentContent orderId={orderId} />
    </AuthGuard>
  );
}
