'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type {
  CommerceOperation,
  CommerceOperationPage,
  CommerceOperationStatus,
} from '@/lib/admin';
import styles from './AdminScreens.module.css';

const statusOptions: Array<{
  label: string;
  value: CommerceOperationStatus | 'ALL';
}> = [
  { label: 'Cần xử lý', value: 'DEAD_LETTER' },
  { label: 'Đang chờ', value: 'PENDING' },
  { label: 'Đang chạy', value: 'PROCESSING' },
  { label: 'Hoàn tất', value: 'PROCESSED' },
  { label: 'Tất cả', value: 'ALL' },
];

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function AdminOperationsScreen() {
  const [status, setStatus] = useState<CommerceOperationStatus | 'ALL'>(
    'DEAD_LETTER',
  );
  const [data, setData] = useState<CommerceOperationPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ limit: '20' });
      if (status !== 'ALL') query.set('status', status);
      setData(
        await api.get<CommerceOperationPage>(
          `v1/admin/operations?${query.toString()}`,
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Không thể tải danh sách tác vụ.',
      );
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function retry(operation: CommerceOperation) {
    if (
      !window.confirm(
        `Chạy lại tác vụ ${operation.eventType} cho aggregate này?`,
      )
    ) {
      return;
    }

    setRetryingId(operation.id);
    setError('');
    try {
      await api.post(`v1/admin/operations/${operation.id}/retry`, {});
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Không thể chạy lại tác vụ.',
      );
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <section className={styles.pageSection} aria-labelledby="operations-title">
      <div className={styles.pageHeading}>
        <div>
          <p className={styles.eyebrow}>Vận hành thanh toán</p>
          <h2 id="operations-title">Tác vụ & hoàn tiền</h2>
          <p>
            Theo dõi outbox, tác vụ lỗi và chủ động chạy lại sau khi đã xác
            minh.
          </p>
        </div>
        <button className={styles.secondaryButton} onClick={() => void load()}>
          Làm mới
        </button>
      </div>

      <div className={styles.toolbar} aria-label="Bộ lọc tác vụ">
        <div className={styles.segmentedControl}>
          {statusOptions.map((option) => (
            <button
              aria-pressed={status === option.value}
              className={
                status === option.value ? styles.segmentActive : undefined
              }
              key={option.value}
              onClick={() => {
                setStatus(option.value);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className={styles.errorState} role="alert">
          <strong>Không thể hoàn tất yêu cầu</strong>
          <span>{error}</span>
        </div>
      ) : null}

      {loading ? (
        <div className={styles.loadingState} role="status">
          Đang tải tác vụ…
        </div>
      ) : data?.data.length ? (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Loại tác vụ</th>
                  <th>Đơn hàng / thanh toán</th>
                  <th>Trạng thái</th>
                  <th>Số lần thử</th>
                  <th>Cập nhật</th>
                  <th aria-label="Thao tác" />
                </tr>
              </thead>
              <tbody>
                {data.data.map((operation) => (
                  <tr key={operation.id}>
                    <td>
                      <strong>{operation.eventType}</strong>
                      <span className={styles.operationId}>
                        {operation.id.slice(0, 8)}
                      </span>
                    </td>
                    <td>
                      <span>{operation.aggregateType}</span>
                      <span className={styles.operationId}>
                        {operation.aggregateId.slice(0, 8)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          operation.status === 'DEAD_LETTER'
                            ? styles.statusDanger
                            : ''
                        }`}
                      >
                        {operation.status}
                      </span>
                    </td>
                    <td>{operation.attempts}</td>
                    <td>{formatDate(operation.updatedAt)}</td>
                    <td>
                      {operation.status === 'DEAD_LETTER' ? (
                        <button
                          className={styles.primaryButton}
                          disabled={retryingId === operation.id}
                          onClick={() => void retry(operation)}
                        >
                          {retryingId === operation.id
                            ? 'Đang chạy…'
                            : 'Chạy lại'}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.data.some((operation) => operation.lastError) ? (
            <div className={styles.operationErrors}>
              <h3>Lỗi gần nhất</h3>
              {data.data
                .filter((operation) => operation.lastError)
                .map((operation) => (
                  <p key={operation.id}>
                    <strong>{operation.eventType}:</strong>{' '}
                    {operation.lastError}
                  </p>
                ))}
            </div>
          ) : null}
          {data.nextCursor ? (
            <div className={styles.pagination}>
              <button
                onClick={async () => {
                  const query = new URLSearchParams({
                    cursor: data.nextCursor ?? '',
                    limit: '20',
                  });
                  if (status !== 'ALL') query.set('status', status);
                  const next = await api.get<CommerceOperationPage>(
                    `v1/admin/operations?${query.toString()}`,
                  );
                  setData({
                    data: [...data.data, ...next.data],
                    nextCursor: next.nextCursor,
                  });
                }}
              >
                Xem thêm
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className={styles.emptyState}>
          <strong>Không có tác vụ phù hợp</strong>
          <span>Hệ thống không ghi nhận tác vụ nào trong trạng thái này.</span>
        </div>
      )}
    </section>
  );
}
