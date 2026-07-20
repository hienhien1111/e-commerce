'use client';
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import type { AdminProductPage } from '@/lib/admin';
import type { Category, Product } from '@/lib/catalog';
import { formatVnd } from '@/lib/catalog';
import { useToast } from '@/providers/ToastProvider';
import styles from './AdminScreens.module.css';

type ProductForm = {
  name: string;
  description: string;
  price: string;
  comparePrice: string;
  stock: string;
  sku: string;
  categoryId: string;
  isActive: boolean;
};

const emptyForm = (): ProductForm => ({
  name: '',
  description: '',
  price: '',
  comparePrice: '',
  stock: '0',
  sku: '',
  categoryId: '',
  isActive: true,
});

const toForm = (product: Product): ProductForm => ({
  name: product.name,
  description: product.description ?? '',
  price: String(product.price),
  comparePrice:
    product.comparePrice === null ? '' : String(product.comparePrice),
  stock: String(product.stock),
  sku: product.sku ?? '',
  categoryId: product.categoryId ?? '',
  isActive: product.isActive,
});

const primaryUrl = (product: Product) =>
  product.images.find((image) => image.isPrimary)?.url ??
  product.images[0]?.url;

export function AdminProductsScreen() {
  const toast = useToast();
  const [page, setPage] = useState<AdminProductPage | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [active, setActive] = useState('');
  const [modalProduct, setModalProduct] = useState<Product | null | undefined>(
    undefined,
  );
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (cursor?: string, append = false) => {
      setError(null);
      const params = new URLSearchParams({ limit: '20' });
      if (search.trim()) params.set('search', search.trim());
      if (categoryId) params.set('categoryId', categoryId);
      if (active) params.set('isActive', active);
      if (cursor) params.set('cursor', cursor);
      try {
        const result = await api.get<AdminProductPage>(
          `v1/admin/products?${params}`,
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
          cause instanceof ApiError ? cause.message : 'Không thể tải sản phẩm.',
        );
      }
    },
    [search, categoryId, active],
  );

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    void api
      .get<Category[]>('v1/admin/categories')
      .then(setCategories)
      .catch(() => undefined);
  }, []);

  const openCreate = () => {
    setForm(emptyForm());
    setFiles([]);
    setModalProduct(null);
  };
  const openEdit = (product: Product) => {
    setForm(toForm(product));
    setFiles([]);
    setModalProduct(product);
  };
  const setField = <K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  const payload = () => ({
    name: form.name.trim(),
    description: form.description.trim() || null,
    price: Number(form.price),
    comparePrice: form.comparePrice ? Number(form.comparePrice) : null,
    stock: Number(form.stock),
    sku: form.sku.trim() || null,
    categoryId: form.categoryId || null,
    isActive: form.isActive,
  });

  const uploadFiles = async (productId: string) => {
    for (const file of files) {
      const data = new FormData();
      data.append('file', file);
      await api.upload(`v1/products/${productId}/images`, data);
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (files.length + (modalProduct?.images.length ?? 0) > 5) {
      setError('Mỗi sản phẩm chỉ có tối đa 5 ảnh.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const saved = modalProduct
        ? await api.patch<Product>(`v1/products/${modalProduct.id}`, payload())
        : await api.post<Product>('v1/products', payload());
      if (files.length) await uploadFiles(saved.id);
      toast.success(
        modalProduct ? 'Đã cập nhật sản phẩm.' : 'Đã tạo sản phẩm.',
      );
      setModalProduct(undefined);
      await load();
    } catch (cause) {
      const message =
        cause instanceof ApiError ? cause.message : 'Không thể lưu sản phẩm.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (product: Product) => {
    try {
      await api.patch(`v1/products/${product.id}`, {
        isActive: !product.isActive,
      });
      toast.success(product.isActive ? 'Đã ẩn sản phẩm.' : 'Đã bật sản phẩm.');
      await load();
    } catch {
      toast.error('Không thể cập nhật trạng thái sản phẩm.');
    }
  };

  const remove = async (product: Product) => {
    if (!window.confirm(`Xóa mềm sản phẩm “${product.name}”?`)) return;
    try {
      await api.delete(`v1/products/${product.id}`);
      toast.success('Đã xóa sản phẩm.');
      await load();
    } catch {
      toast.error('Không thể xóa sản phẩm.');
    }
  };

  const deleteImage = async (imageId: string) => {
    if (!modalProduct) return;
    try {
      await api.delete(`v1/products/${modalProduct.id}/images/${imageId}`);
      setModalProduct(
        (current) =>
          current && {
            ...current,
            images: current.images.filter((image) => image.id !== imageId),
          },
      );
      toast.success('Đã xóa ảnh.');
    } catch {
      toast.error('Không thể xóa ảnh.');
    }
  };

  return (
    <main className={styles.page}>
      <div className="container">
        <div className={styles.heading}>
          <h1>Sản phẩm</h1>
          <button
            className="btn btn-primary"
            onClick={openCreate}
            type="button"
          >
            Thêm sản phẩm
          </button>
        </div>
        <form
          className={`card ${styles.panel} ${styles.filters}`}
          onSubmit={(event) => {
            event.preventDefault();
            void load();
          }}
        >
          <input
            className="form-input"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên"
            value={search}
          />
          <select
            className="form-input"
            onChange={(event) => setCategoryId(event.target.value)}
            value={categoryId}
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            className="form-input"
            onChange={(event) => setActive(event.target.value)}
            value={active}
          >
            <option value="">Mọi trạng thái</option>
            <option value="true">Đang bật</option>
            <option value="false">Đang ẩn</option>
          </select>
          <button className="btn btn-outline" type="submit">
            Lọc
          </button>
        </form>
        {error && <p className={styles.error}>{error}</p>}
        {!page ? (
          <div className="skeleton" style={{ height: 260 }} />
        ) : page.data.length === 0 ? (
          <div className={`card ${styles.empty}`}>
            Chưa có sản phẩm phù hợp.
          </div>
        ) : (
          <div className={`card ${styles.panel} ${styles.tableWrap}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Ảnh</th>
                  <th>Sản phẩm</th>
                  <th>Giá / Tồn</th>
                  <th>Danh mục</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {page.data.map((product) => (
                  <tr key={product.id}>
                    <td>
                      {primaryUrl(product) ? (
                        <img
                          alt=""
                          className={styles.thumbnail}
                          src={primaryUrl(product)}
                        />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <b>{product.name}</b>
                      <br />
                      <small className={styles.muted}>
                        {product.sku ?? product.slug}
                      </small>
                    </td>
                    <td>
                      {formatVnd(product.price)}
                      <br />
                      <small className={styles.muted}>
                        Tồn: {product.stock}
                      </small>
                    </td>
                    <td>
                      {categories.find((item) => item.id === product.categoryId)
                        ?.name ?? '—'}
                    </td>
                    <td
                      className={
                        product.isActive ? styles.statusOn : styles.statusOff
                      }
                    >
                      {product.isActive ? 'Đang bật' : 'Đang ẩn'}
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          onClick={() => void toggleActive(product)}
                          type="button"
                        >
                          {product.isActive ? 'Ẩn' : 'Bật'}
                        </button>
                        <button onClick={() => openEdit(product)} type="button">
                          Sửa
                        </button>
                        <button
                          onClick={() => void remove(product)}
                          type="button"
                        >
                          Xóa
                        </button>
                      </div>
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
              onClick={() => void load(page.nextCursor ?? undefined, true)}
              type="button"
            >
              Xem thêm
            </button>
          </p>
        )}
      </div>
      {modalProduct !== undefined && (
        <div className={styles.modalBackdrop} role="presentation">
          <form className={styles.modal} onSubmit={save}>
            <h2>{modalProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h2>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.modalGrid}>
              <label className="form-group wide">
                <span className="form-label">Tên *</span>
                <input
                  className="form-input"
                  onChange={(event) => setField('name', event.target.value)}
                  required
                  value={form.name}
                />
              </label>
              <label className="form-group wide">
                <span className="form-label">Mô tả</span>
                <textarea
                  className="form-input"
                  onChange={(event) =>
                    setField('description', event.target.value)
                  }
                  value={form.description}
                />
              </label>
              <label className="form-group">
                <span className="form-label">Giá VND *</span>
                <input
                  className="form-input"
                  min="0"
                  onChange={(event) => setField('price', event.target.value)}
                  required
                  type="number"
                  value={form.price}
                />
              </label>
              <label className="form-group">
                <span className="form-label">Giá so sánh</span>
                <input
                  className="form-input"
                  min="0"
                  onChange={(event) =>
                    setField('comparePrice', event.target.value)
                  }
                  type="number"
                  value={form.comparePrice}
                />
              </label>
              <label className="form-group">
                <span className="form-label">Tồn kho</span>
                <input
                  className="form-input"
                  min="0"
                  onChange={(event) => setField('stock', event.target.value)}
                  required
                  type="number"
                  value={form.stock}
                />
              </label>
              <label className="form-group">
                <span className="form-label">SKU</span>
                <input
                  className="form-input"
                  onChange={(event) => setField('sku', event.target.value)}
                  value={form.sku}
                />
              </label>
              <label className="form-group">
                <span className="form-label">Danh mục</span>
                <select
                  className="form-input"
                  onChange={(event) =>
                    setField('categoryId', event.target.value)
                  }
                  value={form.categoryId}
                >
                  <option value="">Không chọn</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.check}>
                <input
                  checked={form.isActive}
                  onChange={(event) =>
                    setField('isActive', event.target.checked)
                  }
                  type="checkbox"
                />{' '}
                Đang bán
              </label>
              <label className="form-group wide">
                <span className="form-label">
                  Ảnh sản phẩm (JPEG/PNG/WebP, tối đa 5)
                </span>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(event) =>
                    setFiles(
                      Array.from(event.target.files ?? []).slice(
                        0,
                        5 - (modalProduct?.images.length ?? 0),
                      ),
                    )
                  }
                  type="file"
                />
                {files.length > 0 && (
                  <small>{files.length} ảnh sẽ được tải lên sau khi lưu.</small>
                )}
              </label>
              {modalProduct?.images.length ? (
                <div className="wide">
                  <span className="form-label">Ảnh hiện có</span>
                  <div className={styles.imageList}>
                    {modalProduct.images.map((image) => (
                      <div className={styles.imageItem} key={image.id}>
                        <img alt="" src={image.url} />
                        <button
                          onClick={() => void deleteImage(image.id)}
                          type="button"
                        >
                          Xóa ảnh
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className={styles.modalFooter}>
              <button
                className="btn btn-ghost"
                onClick={() => setModalProduct(undefined)}
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
