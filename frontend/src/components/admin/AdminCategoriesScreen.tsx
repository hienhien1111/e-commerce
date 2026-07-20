'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import type { Category } from '@/lib/catalog';
import { useToast } from '@/providers/ToastProvider';
import styles from './AdminScreens.module.css';

type CategoryForm = {
  name: string;
  description: string;
  parentId: string;
  sortOrder: string;
  isActive: boolean;
};
const blank = (): CategoryForm => ({
  name: '',
  description: '',
  parentId: '',
  sortOrder: '0',
  isActive: true,
});
const toForm = (category: Category): CategoryForm => ({
  name: category.name,
  description: category.description ?? '',
  parentId: category.parentId ?? '',
  sortOrder: String(category.sortOrder),
  isActive: category.isActive,
});

export function AdminCategoriesScreen() {
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [active, setActive] = useState('');
  const [modalCategory, setModalCategory] = useState<
    Category | null | undefined
  >(undefined);
  const [form, setForm] = useState<CategoryForm>(blank);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const params = active ? `?isActive=${active}` : '';
    try {
      setCategories(await api.get<Category[]>(`v1/admin/categories${params}`));
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : 'Không thể tải danh mục.',
      );
    }
  }, [active]);
  useEffect(() => {
    void load();
  }, [load]);
  const roots = categories.filter((category) => category.parentId === null);
  const set = <K extends keyof CategoryForm>(key: K, value: CategoryForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const open = (category?: Category) => {
    setError(null);
    setForm(category ? toForm(category) : blank());
    setModalCategory(category ?? null);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        parentId: form.parentId || null,
        sortOrder: Number(form.sortOrder),
        isActive: form.isActive,
      };
      if (modalCategory)
        await api.patch(`v1/categories/${modalCategory.id}`, body);
      else await api.post('v1/categories', body);
      toast.success(
        modalCategory ? 'Đã cập nhật danh mục.' : 'Đã tạo danh mục.',
      );
      setModalCategory(undefined);
      await load();
    } catch (cause) {
      const message =
        cause instanceof ApiError ? cause.message : 'Không thể lưu danh mục.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (category: Category) => {
    try {
      await api.patch(`v1/categories/${category.id}`, {
        isActive: !category.isActive,
      });
      toast.success('Đã cập nhật trạng thái.');
      await load();
    } catch {
      toast.error('Không thể cập nhật trạng thái.');
    }
  };
  const remove = async (category: Category) => {
    if (!window.confirm(`Xóa mềm danh mục “${category.name}”?`)) return;
    try {
      await api.delete(`v1/categories/${category.id}`);
      toast.success('Đã xóa danh mục.');
      await load();
    } catch (cause) {
      toast.error(
        cause instanceof ApiError ? cause.message : 'Không thể xóa danh mục.',
      );
    }
  };
  return (
    <main className={styles.page}>
      <div className="container">
        <div className={styles.heading}>
          <h1>Danh mục</h1>
          <button
            className="btn btn-primary"
            onClick={() => open()}
            type="button"
          >
            Thêm danh mục
          </button>
        </div>
        <div className={`card ${styles.panel} ${styles.filters}`}>
          <select
            className="form-input"
            onChange={(event) => setActive(event.target.value)}
            value={active}
          >
            <option value="">Mọi trạng thái</option>
            <option value="true">Đang bật</option>
            <option value="false">Đang ẩn</option>
          </select>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <div className={`card ${styles.panel} ${styles.tableWrap}`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tên</th>
                <th>Danh mục cha</th>
                <th>Thứ tự</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td className={styles.empty} colSpan={5}>
                    Chưa có danh mục.
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <b>{category.name}</b>
                      <br />
                      <small className={styles.muted}>{category.slug}</small>
                    </td>
                    <td>
                      {categories.find((item) => item.id === category.parentId)
                        ?.name ?? '—'}
                    </td>
                    <td>{category.sortOrder}</td>
                    <td
                      className={
                        category.isActive ? styles.statusOn : styles.statusOff
                      }
                    >
                      {category.isActive ? 'Đang bật' : 'Đang ẩn'}
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          onClick={() => void toggle(category)}
                          type="button"
                        >
                          {category.isActive ? 'Ẩn' : 'Bật'}
                        </button>
                        <button onClick={() => open(category)} type="button">
                          Sửa
                        </button>
                        <button
                          onClick={() => void remove(category)}
                          type="button"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {modalCategory !== undefined && (
        <div className={styles.modalBackdrop} role="presentation">
          <form className={styles.modal} onSubmit={save}>
            <h2>{modalCategory ? 'Sửa danh mục' : 'Thêm danh mục'}</h2>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.modalGrid}>
              <label className="form-group wide">
                <span className="form-label">Tên *</span>
                <input
                  className="form-input"
                  onChange={(event) => set('name', event.target.value)}
                  required
                  value={form.name}
                />
              </label>
              <label className="form-group wide">
                <span className="form-label">Mô tả</span>
                <textarea
                  className="form-input"
                  onChange={(event) => set('description', event.target.value)}
                  value={form.description}
                />
              </label>
              <label className="form-group">
                <span className="form-label">Danh mục cha</span>
                <select
                  className="form-input"
                  onChange={(event) => set('parentId', event.target.value)}
                  value={form.parentId}
                >
                  <option value="">Danh mục gốc</option>
                  {roots
                    .filter((root) => root.id !== modalCategory?.id)
                    .map((root) => (
                      <option key={root.id} value={root.id}>
                        {root.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="form-group">
                <span className="form-label">Thứ tự</span>
                <input
                  className="form-input"
                  min="0"
                  onChange={(event) => set('sortOrder', event.target.value)}
                  type="number"
                  value={form.sortOrder}
                />
              </label>
              <label className={styles.check}>
                <input
                  checked={form.isActive}
                  onChange={(event) => set('isActive', event.target.checked)}
                  type="checkbox"
                />{' '}
                Hiển thị công khai
              </label>
            </div>
            <div className={styles.modalFooter}>
              <button
                className="btn btn-ghost"
                onClick={() => setModalCategory(undefined)}
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
