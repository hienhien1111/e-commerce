'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import type { Coupon } from '@/lib/admin';
import { formatVnd } from '@/lib/catalog';
import { useToast } from '@/providers/ToastProvider';
import {
  readUrlFilter,
  useAdminFilterUrl,
  useDebouncedValue,
} from '@/hooks/useAdminFilters';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import styles from './AdminScreens.module.css';

type CouponForm = {
  code: string;
  discountType: Coupon['discountType'];
  discountValue: string;
  maxDiscount: string;
  minOrderAmount: string;
  maxUsage: string;
  expiresAt: string;
  isActive: boolean;
};
const blank = (): CouponForm => ({
  code: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  maxDiscount: '',
  minOrderAmount: '',
  maxUsage: '',
  expiresAt: '',
  isActive: true,
});
const toForm = (coupon: Coupon): CouponForm => ({
  code: coupon.code,
  discountType: coupon.discountType,
  discountValue: String(coupon.discountValue),
  maxDiscount: coupon.maxDiscount === null ? '' : String(coupon.maxDiscount),
  minOrderAmount:
    coupon.minOrderAmount === null ? '' : String(coupon.minOrderAmount),
  maxUsage: coupon.maxUsage === null ? '' : String(coupon.maxUsage),
  expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 16) : '',
  isActive: coupon.isActive,
});

export function AdminCouponsScreen() {
  const toast = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [search, setSearch] = useState(() => readUrlFilter('search'));
  const [active, setActive] = useState(() => readUrlFilter('isActive'));
  const [modalCoupon, setModalCoupon] = useState<Coupon | null | undefined>(
    undefined,
  );
  const [form, setForm] = useState<CouponForm>(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editor = useDialogFocus<HTMLFormElement>(
    modalCoupon !== undefined,
    () => setModalCoupon(undefined),
  );
  const debouncedSearch = useDebouncedValue(search);
  useAdminFilterUrl({
    isActive: active,
    search: debouncedSearch.trim(),
  });
  const load = useCallback(async () => {
    try {
      setCoupons(await api.get<Coupon[]>('v1/coupons'));
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : 'Không thể tải coupon.',
      );
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const normalizedSearch = debouncedSearch.trim().toLocaleUpperCase('vi');
  const visibleCoupons = coupons.filter(
    (coupon) =>
      (!normalizedSearch || coupon.code.includes(normalizedSearch)) &&
      (!active || String(coupon.isActive) === active),
  );
  const set = <K extends keyof CouponForm>(key: K, value: CouponForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const open = (coupon?: Coupon) => {
    setError(null);
    setForm(coupon ? toForm(coupon) : blank());
    setModalCoupon(coupon ?? null);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = {
        code: form.code.trim(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        maxDiscount:
          form.discountType === 'PERCENTAGE' && form.maxDiscount
            ? Number(form.maxDiscount)
            : null,
        minOrderAmount: form.minOrderAmount
          ? Number(form.minOrderAmount)
          : null,
        maxUsage: form.maxUsage ? Number(form.maxUsage) : null,
        expiresAt: form.expiresAt
          ? new Date(form.expiresAt).toISOString()
          : null,
        isActive: form.isActive,
      };
      if (modalCoupon) await api.patch(`v1/coupons/${modalCoupon.id}`, body);
      else await api.post('v1/coupons', body);
      toast.success(modalCoupon ? 'Đã cập nhật coupon.' : 'Đã tạo coupon.');
      setModalCoupon(undefined);
      await load();
    } catch (cause) {
      const message =
        cause instanceof ApiError ? cause.message : 'Không thể lưu coupon.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (coupon: Coupon) => {
    try {
      if (coupon.isActive)
        await api.patch(`v1/coupons/${coupon.id}/deactivate`);
      else await api.patch(`v1/coupons/${coupon.id}`, { isActive: true });
      toast.success(coupon.isActive ? 'Đã tắt coupon.' : 'Đã bật coupon.');
      await load();
    } catch {
      toast.error('Không thể cập nhật coupon.');
    }
  };
  return (
    <main className={styles.page}>
      <div className="container">
        <div className={styles.heading}>
          <h1>Coupons</h1>
          <button
            className="btn btn-primary"
            onClick={() => open()}
            type="button"
          >
            Thêm coupon
          </button>
        </div>
        <div className={`card ${styles.panel} ${styles.filters}`}>
          <input
            aria-label="Tìm coupon"
            className="form-input"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo mã coupon"
            value={search}
          />
          <select
            aria-label="Trạng thái coupon"
            className="form-input"
            onChange={(event) => setActive(event.target.value)}
            value={active}
          >
            <option value="">Mọi trạng thái</option>
            <option value="true">Đang bật</option>
            <option value="false">Đã tắt</option>
          </select>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        {!visibleCoupons.length ? (
          <div className={`card ${styles.empty}`}>Chưa có coupon.</div>
        ) : (
          <div className={`card ${styles.panel} ${styles.tableWrap}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Giảm giá</th>
                  <th>Điều kiện</th>
                  <th>Lượt dùng</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibleCoupons.map((coupon) => (
                  <tr key={coupon.id}>
                    <td>
                      <b>{coupon.code}</b>
                      <br />
                      <small className={styles.muted}>
                        {coupon.expiresAt
                          ? `Hết hạn ${new Date(coupon.expiresAt).toLocaleDateString('vi-VN')}`
                          : 'Không hết hạn'}
                      </small>
                    </td>
                    <td>
                      {coupon.discountType === 'PERCENTAGE'
                        ? `${coupon.discountValue}%${coupon.maxDiscount ? ` (tối đa ${formatVnd(coupon.maxDiscount)})` : ''}`
                        : formatVnd(coupon.discountValue)}
                    </td>
                    <td>
                      {coupon.minOrderAmount
                        ? `Từ ${formatVnd(coupon.minOrderAmount)}`
                        : '—'}
                    </td>
                    <td>
                      {coupon.usedCount}/{coupon.maxUsage ?? '∞'}
                    </td>
                    <td
                      className={
                        coupon.isActive ? styles.statusOn : styles.statusOff
                      }
                    >
                      {coupon.isActive ? 'Đang bật' : 'Đã tắt'}
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          onClick={() => void toggle(coupon)}
                          type="button"
                        >
                          {coupon.isActive ? 'Tắt' : 'Bật'}
                        </button>
                        <button onClick={() => open(coupon)} type="button">
                          Sửa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modalCoupon !== undefined && (
        <div className={styles.modalBackdrop} role="presentation">
          <form
            aria-labelledby="coupon-editor-title"
            aria-modal="true"
            className={styles.modal}
            onKeyDown={editor.onKeyDown}
            onSubmit={save}
            ref={editor.ref}
            role="dialog"
          >
            <h2 id="coupon-editor-title">
              {modalCoupon ? 'Sửa coupon' : 'Thêm coupon'}
            </h2>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.modalGrid}>
              <label className="form-group">
                <span className="form-label">Mã *</span>
                <input
                  className="form-input"
                  onChange={(event) =>
                    set('code', event.target.value.toUpperCase())
                  }
                  required
                  value={form.code}
                />
              </label>
              <label className="form-group">
                <span className="form-label">Loại *</span>
                <select
                  className="form-input"
                  onChange={(event) =>
                    set(
                      'discountType',
                      event.target.value as Coupon['discountType'],
                    )
                  }
                  value={form.discountType}
                >
                  <option value="PERCENTAGE">Phần trăm</option>
                  <option value="FIXED_AMOUNT">Số tiền cố định</option>
                </select>
              </label>
              <label className="form-group">
                <span className="form-label">Giá trị *</span>
                <input
                  className="form-input"
                  min="1"
                  onChange={(event) => set('discountValue', event.target.value)}
                  required
                  type="number"
                  value={form.discountValue}
                />
              </label>
              {form.discountType === 'PERCENTAGE' && (
                <label className="form-group">
                  <span className="form-label">Giảm tối đa (VND)</span>
                  <input
                    className="form-input"
                    min="1"
                    onChange={(event) => set('maxDiscount', event.target.value)}
                    type="number"
                    value={form.maxDiscount}
                  />
                </label>
              )}
              <label className="form-group">
                <span className="form-label">Đơn tối thiểu (VND)</span>
                <input
                  className="form-input"
                  min="0"
                  onChange={(event) =>
                    set('minOrderAmount', event.target.value)
                  }
                  type="number"
                  value={form.minOrderAmount}
                />
              </label>
              <label className="form-group">
                <span className="form-label">Số lượt tối đa</span>
                <input
                  className="form-input"
                  min="1"
                  onChange={(event) => set('maxUsage', event.target.value)}
                  type="number"
                  value={form.maxUsage}
                />
              </label>
              <label className="form-group wide">
                <span className="form-label">Ngày hết hạn</span>
                <input
                  className="form-input"
                  onChange={(event) => set('expiresAt', event.target.value)}
                  type="datetime-local"
                  value={form.expiresAt}
                />
              </label>
              <label className={styles.check}>
                <input
                  checked={form.isActive}
                  onChange={(event) => set('isActive', event.target.checked)}
                  type="checkbox"
                />{' '}
                Đang bật
              </label>
            </div>
            <div className={styles.modalFooter}>
              <button
                className="btn btn-ghost"
                onClick={() => setModalCoupon(undefined)}
                type="button"
              >
                Hủy
              </button>
              <button className="btn btn-primary" disabled={busy} type="submit">
                {busy ? 'Đang lưu…' : 'Lưu'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
