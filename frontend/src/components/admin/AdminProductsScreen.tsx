'use client';
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import type { AdminProductPage } from '@/lib/admin';
import type { Category, Product, ProductVariant } from '@/lib/catalog';
import { formatVnd } from '@/lib/catalog';
import { useToast } from '@/providers/ToastProvider';
import {
  readUrlFilter,
  useAdminFilterUrl,
  useDebouncedValue,
} from '@/hooks/useAdminFilters';
import { useDialogFocus } from '@/hooks/useDialogFocus';
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

type VariantForm = {
  id: string | null;
  label: string;
  sku: string;
  price: string;
  comparePrice: string;
  stock: string;
  isActive: boolean;
  imageId: string;
};

type CreateProductVariantPayload = {
  label: string;
  sku: string;
  price: number;
  comparePrice: number | null;
  stock: number;
  isActive: boolean;
};

const emptyVariantForm = (): VariantForm => ({
  id: null,
  label: '',
  sku: '',
  price: '',
  comparePrice: '',
  stock: '0',
  isActive: true,
  imageId: '',
});

const toVariantForm = (variant: ProductVariant): VariantForm => ({
  id: variant.id,
  label: variant.label ?? '',
  sku: variant.sku,
  price: String(variant.price),
  comparePrice:
    variant.comparePrice === null ? '' : String(variant.comparePrice),
  stock: String(variant.stock),
  isActive: variant.isActive,
  imageId: variant.imageId ?? '',
});

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

const variantPayload = (variant: VariantForm): CreateProductVariantPayload => ({
  label: variant.label.trim(),
  sku: variant.sku.trim(),
  price: Number(variant.price),
  comparePrice: variant.comparePrice ? Number(variant.comparePrice) : null,
  stock: Number(variant.stock),
  isActive: variant.isActive,
});

const variantFormError = (
  variant: VariantForm,
  options: { requireLabel: boolean },
): string | null => {
  const data = variantPayload(variant);
  if (options.requireLabel && !data.label) {
    return 'Mỗi biến thể cần có nhãn để khách hàng phân biệt.';
  }
  if (!data.sku) return 'SKU của biến thể là bắt buộc.';
  if (!Number.isInteger(data.price) || data.price < 0) {
    return 'Giá biến thể phải là số nguyên không âm.';
  }
  if (!Number.isInteger(data.stock) || data.stock < 0) {
    return 'Tồn kho biến thể phải là số nguyên không âm.';
  }
  if (
    data.comparePrice !== null &&
    (!Number.isInteger(data.comparePrice) || data.comparePrice < data.price)
  ) {
    return 'Giá so sánh phải là số nguyên và không nhỏ hơn giá bán.';
  }
  return null;
};

export function AdminProductsScreen() {
  const toast = useToast();
  const [page, setPage] = useState<AdminProductPage | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState(() => readUrlFilter('search'));
  const [categoryId, setCategoryId] = useState(() =>
    readUrlFilter('categoryId'),
  );
  const [active, setActive] = useState(() => readUrlFilter('isActive'));
  const [modalProduct, setModalProduct] = useState<Product | null | undefined>(
    undefined,
  );
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [files, setFiles] = useState<File[]>([]);
  const [variantForm, setVariantForm] = useState<VariantForm>(emptyVariantForm);
  const [creationVariants, setCreationVariants] = useState<VariantForm[]>([]);
  const [editingCreationVariant, setEditingCreationVariant] = useState<
    number | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editor = useDialogFocus<HTMLFormElement>(
    modalProduct !== undefined,
    () => setModalProduct(undefined),
  );
  const debouncedSearch = useDebouncedValue(search);
  useAdminFilterUrl({
    categoryId,
    isActive: active,
    search: debouncedSearch.trim(),
  });

  const load = useCallback(
    async (cursor?: string, append = false) => {
      setError(null);
      const params = new URLSearchParams({ limit: '20' });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
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
    [debouncedSearch, categoryId, active],
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
    setVariantForm(emptyVariantForm());
    setCreationVariants([]);
    setEditingCreationVariant(null);
  };
  const openEdit = (product: Product) => {
    setForm(toForm(product));
    setFiles([]);
    setModalProduct(product);
    setVariantForm(emptyVariantForm());
    setCreationVariants([]);
    setEditingCreationVariant(null);
  };
  const setField = <K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  const payload = () => {
    const base = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      categoryId: form.categoryId || null,
      isActive: form.isActive,
    };
    const isVariantProduct = modalProduct?.variants.some(
      (variant) => variant.label !== null,
    );
    if (modalProduct === null && creationVariants.length > 0) {
      const firstVariant = variantPayload(creationVariants[0]);
      return {
        ...base,
        // v1 still requires these legacy projection fields. The API derives
        // their stored values from the submitted variants atomically.
        price: firstVariant.price,
        comparePrice: firstVariant.comparePrice,
        stock: firstVariant.stock,
        sku: firstVariant.sku,
        variants: creationVariants.map(variantPayload),
      };
    }
    return isVariantProduct
      ? base
      : {
          ...base,
          price: Number(form.price),
          comparePrice: form.comparePrice ? Number(form.comparePrice) : null,
          stock: Number(form.stock),
          sku: form.sku.trim() || null,
        };
  };

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
    const attachedVariants = modalProduct.variants.filter(
      (variant) => variant.imageId === imageId,
    );
    if (
      attachedVariants.length > 0 &&
      !window.confirm(
        `Ảnh này đang được dùng bởi ${attachedVariants.length} mẫu mã. Xóa ảnh sẽ gỡ liên kết ảnh khỏi các mẫu đó. Tiếp tục?`,
      )
    )
      return;
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

  const saveVariant = async () => {
    if (!modalProduct) return;
    const validation = variantFormError(variantForm, {
      requireLabel: !variantForm.id,
    });
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    setError(null);
    const payload = {
      label: variantForm.label.trim() || null,
      sku: variantForm.sku.trim(),
      price: Number(variantForm.price),
      comparePrice: variantForm.comparePrice
        ? Number(variantForm.comparePrice)
        : null,
      stock: Number(variantForm.stock),
      isActive: variantForm.isActive,
      imageId: variantForm.imageId || null,
    };
    try {
      const saved = variantForm.id
        ? await api.patch<ProductVariant>(
            `v1/products/${modalProduct.id}/variants/${variantForm.id}`,
            payload,
          )
        : await api.post<ProductVariant>(
            `v1/products/${modalProduct.id}/variants`,
            payload,
          );
      setModalProduct(
        (current) =>
          current && {
            ...current,
            hasVariants: true,
            variants: variantForm.id
              ? current.variants.map((variant) =>
                  variant.id === saved.id ? saved : variant,
                )
              : [...current.variants, saved],
          },
      );
      setVariantForm(emptyVariantForm());
      toast.success('Đã lưu mẫu mã.');
      await load();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : 'Không thể lưu mẫu mã.',
      );
    } finally {
      setBusy(false);
    }
  };

  const queueCreationVariant = () => {
    const validation = variantFormError(variantForm, { requireLabel: true });
    if (validation) {
      setError(validation);
      return;
    }
    const candidate = variantPayload(variantForm);
    const conflicts = creationVariants.some((variant, index) => {
      if (index === editingCreationVariant) return false;
      const existing = variantPayload(variant);
      return (
        existing.label.toLocaleLowerCase() ===
          candidate.label.toLocaleLowerCase() ||
        existing.sku.toLocaleLowerCase() === candidate.sku.toLocaleLowerCase()
      );
    });
    if (conflicts) {
      setError('Nhãn và SKU phải khác nhau giữa các biến thể.');
      return;
    }
    setCreationVariants((current) =>
      editingCreationVariant === null
        ? [...current, { ...variantForm, id: null, imageId: '' }]
        : current.map((variant, index) =>
            index === editingCreationVariant
              ? { ...variantForm, id: null, imageId: '' }
              : variant,
          ),
    );
    setVariantForm(emptyVariantForm());
    setEditingCreationVariant(null);
    setError(null);
  };

  const editCreationVariant = (index: number) => {
    setVariantForm({ ...creationVariants[index], imageId: '' });
    setEditingCreationVariant(index);
    setError(null);
  };

  const removeCreationVariant = (index: number) => {
    setCreationVariants((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
    if (editingCreationVariant === index) {
      setVariantForm(emptyVariantForm());
      setEditingCreationVariant(null);
    } else if (
      editingCreationVariant !== null &&
      editingCreationVariant > index
    ) {
      setEditingCreationVariant((current) =>
        current === null ? null : current - 1,
      );
    }
  };

  const removeVariant = async (variant: ProductVariant) => {
    if (
      !modalProduct ||
      !window.confirm(`Xóa mẫu mã “${variant.label ?? 'Mặc định'}”?`)
    )
      return;
    try {
      await api.delete(`v1/products/${modalProduct.id}/variants/${variant.id}`);
      setModalProduct(
        (current) =>
          current && {
            ...current,
            variants: current.variants.filter((item) => item.id !== variant.id),
          },
      );
      toast.success('Đã xóa mẫu mã.');
      await load();
    } catch (cause) {
      toast.error(
        cause instanceof ApiError ? cause.message : 'Không thể xóa mẫu mã.',
      );
    }
  };

  const isVariantProduct = Boolean(
    modalProduct?.variants.some((variant) => variant.label !== null),
  );
  const isCreatingVariantProduct =
    modalProduct === null && creationVariants.length > 0;

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
            aria-label="Tìm sản phẩm"
            className="form-input"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên"
            value={search}
          />
          <select
            aria-label="Danh mục sản phẩm"
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
            aria-label="Trạng thái sản phẩm"
            className="form-input"
            onChange={(event) => setActive(event.target.value)}
            value={active}
          >
            <option value="">Mọi trạng thái</option>
            <option value="true">Đang bật</option>
            <option value="false">Đang ẩn</option>
          </select>
          <span className={styles.muted}>Bộ lọc tự động cập nhật</span>
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
          <form
            aria-labelledby="product-editor-title"
            aria-modal="true"
            className={styles.modal}
            onKeyDown={editor.onKeyDown}
            onSubmit={save}
            ref={editor.ref}
            role="dialog"
          >
            <h2 id="product-editor-title">
              {modalProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
            </h2>
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
              {!isVariantProduct && !isCreatingVariantProduct && (
                <>
                  <label className="form-group">
                    <span className="form-label">Giá VND *</span>
                    <input
                      className="form-input"
                      min="0"
                      onChange={(event) =>
                        setField('price', event.target.value)
                      }
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
                      onChange={(event) =>
                        setField('stock', event.target.value)
                      }
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
                </>
              )}
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
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
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
              <div className={`wide ${styles.variantPanel}`}>
                <div className={styles.variantHeading}>
                  <span className="form-label">Mẫu mã / biến thể</span>
                  {modalProduct ? (
                    <small>
                      Đổi “Mặc định” thành mẫu đầu tiên trước khi thêm mẫu mới.
                    </small>
                  ) : (
                    <small>
                      Thêm các mẫu mã trước khi lưu. Sản phẩm và toàn bộ mẫu mã
                      sẽ được tạo trong một thao tác.
                    </small>
                  )}
                </div>
                <div className={styles.variantList}>
                  {modalProduct ? (
                    modalProduct.variants.map((variant) => (
                      <div className={styles.variantRow} key={variant.id}>
                        <span>{variant.label ?? 'Mặc định'}</span>
                        <span>{variant.sku}</span>
                        <span>{formatVnd(variant.price)}</span>
                        <span>Tồn: {variant.stock}</span>
                        <button
                          onClick={() => setVariantForm(toVariantForm(variant))}
                          type="button"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => void removeVariant(variant)}
                          type="button"
                        >
                          Xóa
                        </button>
                      </div>
                    ))
                  ) : creationVariants.length > 0 ? (
                    creationVariants.map((variant, index) => (
                      <div
                        className={styles.variantRow}
                        key={`${variant.sku}-${index}`}
                      >
                        <span>{variant.label}</span>
                        <span>{variant.sku}</span>
                        <span>{formatVnd(Number(variant.price))}</span>
                        <span>Tồn: {variant.stock}</span>
                        <button
                          onClick={() => editCreationVariant(index)}
                          type="button"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => removeCreationVariant(index)}
                          type="button"
                        >
                          Xóa
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className={styles.variantEmpty}>
                      Chưa có biến thể. Bỏ qua phần này để tạo một sản phẩm đơn
                      với giá và tồn kho ở trên.
                    </p>
                  )}
                </div>
                {!modalProduct && (
                  <p className={styles.variantHint}>
                    Ảnh chung được tải lên cùng sản phẩm. Bạn có thể gán ảnh
                    riêng cho từng biến thể trong màn hình sửa sau khi lưu.
                  </p>
                )}
                <div className={styles.variantForm}>
                  <input
                    aria-label="Nhãn biến thể"
                    className="form-input"
                    onChange={(event) =>
                      setVariantForm((current) => ({
                        ...current,
                        label: event.target.value,
                      }))
                    }
                    placeholder="Nhãn, ví dụ: Đen - L"
                    value={variantForm.label}
                  />
                  <input
                    aria-label="SKU biến thể"
                    className="form-input"
                    onChange={(event) =>
                      setVariantForm((current) => ({
                        ...current,
                        sku: event.target.value,
                      }))
                    }
                    placeholder="SKU *"
                    value={variantForm.sku}
                  />
                  <input
                    aria-label="Giá biến thể"
                    className="form-input"
                    min="0"
                    onChange={(event) =>
                      setVariantForm((current) => ({
                        ...current,
                        price: event.target.value,
                      }))
                    }
                    placeholder="Giá *"
                    type="number"
                    value={variantForm.price}
                  />
                  <input
                    aria-label="Giá so sánh biến thể"
                    className="form-input"
                    min="0"
                    onChange={(event) =>
                      setVariantForm((current) => ({
                        ...current,
                        comparePrice: event.target.value,
                      }))
                    }
                    placeholder="Giá so sánh"
                    type="number"
                    value={variantForm.comparePrice}
                  />
                  <input
                    aria-label="Tồn kho biến thể"
                    className="form-input"
                    min="0"
                    onChange={(event) =>
                      setVariantForm((current) => ({
                        ...current,
                        stock: event.target.value,
                      }))
                    }
                    placeholder="Tồn kho *"
                    type="number"
                    value={variantForm.stock}
                  />
                  {modalProduct && (
                    <select
                      aria-label="Ảnh biến thể"
                      className="form-input"
                      onChange={(event) =>
                        setVariantForm((current) => ({
                          ...current,
                          imageId: event.target.value,
                        }))
                      }
                      value={variantForm.imageId}
                    >
                      <option value="">Dùng ảnh chung</option>
                      {modalProduct.images.map((image) => (
                        <option key={image.id} value={image.id}>
                          Ảnh {image.sortOrder + 1}
                        </option>
                      ))}
                    </select>
                  )}
                  <label className={styles.check}>
                    <input
                      checked={variantForm.isActive}
                      onChange={(event) =>
                        setVariantForm((current) => ({
                          ...current,
                          isActive: event.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    Bán
                  </label>
                  <button
                    className="btn btn-outline"
                    disabled={busy}
                    onClick={() =>
                      modalProduct ? void saveVariant() : queueCreationVariant()
                    }
                    type="button"
                  >
                    {modalProduct
                      ? variantForm.id
                        ? 'Cập nhật mẫu'
                        : 'Thêm mẫu'
                      : editingCreationVariant === null
                        ? 'Thêm vào danh sách'
                        : 'Cập nhật danh sách'}
                  </button>
                  {(variantForm.id || editingCreationVariant !== null) && (
                    <button
                      className="btn btn-ghost"
                      onClick={() => {
                        setVariantForm(emptyVariantForm());
                        setEditingCreationVariant(null);
                      }}
                      type="button"
                    >
                      Hủy sửa
                    </button>
                  )}
                </div>
              </div>
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
