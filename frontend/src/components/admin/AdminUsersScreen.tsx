'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import type { AdminUser, CursorPage } from '@/lib/admin';
import styles from './AdminScreens.module.css';

export function AdminUsersScreen() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState<CursorPage<AdminUser> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(
    async (cursor?: string, append = false) => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ limit: '20' });
      if (search.trim()) params.set('search', search.trim());
      if (cursor) params.set('cursor', cursor);
      try {
        const result = await api.get<CursorPage<AdminUser>>(
          `v1/users?${params}`,
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
          cause instanceof ApiError
            ? cause.message
            : 'Không thể tải người dùng.',
        );
      } finally {
        setLoading(false);
      }
    },
    [search],
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
        <div className={styles.heading}>
          <div>
            <h1>Người dùng</h1>
            <p className={styles.muted}>
              Chỉ đọc, không hiển thị tài khoản đã xóa.
            </p>
          </div>
        </div>
        <form
          className={`card ${styles.panel} ${styles.filters}`}
          onSubmit={apply}
        >
          <input
            className="form-input"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm email hoặc tên"
            value={search}
          />
          <button className="btn btn-outline" type="submit">
            Tìm
          </button>
        </form>
        {error && <p className={styles.error}>{error}</p>}
        {loading && !page ? (
          <div className="skeleton" style={{ height: 220 }} />
        ) : page?.data.length === 0 ? (
          <div className={`card ${styles.empty}`}>
            Không tìm thấy người dùng.
          </div>
        ) : (
          <div className={`card ${styles.panel} ${styles.tableWrap}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Provider</th>
                  <th>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {page?.data.map((user) => (
                  <tr key={user.id}>
                    <td>
                      {[user.lastName, user.firstName]
                        .filter(Boolean)
                        .join(' ') || '—'}
                    </td>
                    <td>{user.email ?? '—'}</td>
                    <td>{user.role?.name ?? '—'}</td>
                    <td>{user.provider}</td>
                    <td>
                      {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {page?.nextCursor && (
          <p className={styles.more}>
            <button
              className="btn btn-outline"
              disabled={loading}
              onClick={() => void load(page.nextCursor ?? undefined, true)}
              type="button"
            >
              {loading ? 'Đang tải…' : 'Xem thêm'}
            </button>
          </p>
        )}
      </div>
    </main>
  );
}
