'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Category, formatVnd, Product, ProductPage } from '@/lib/catalog';
import styles from './CatalogBrowser.module.css';

function queryString(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const encoded = search.toString();
  return encoded ? `?${encoded}` : '';
}

function primaryImage(product: Product): string | undefined {
  return (
    product.images.find((image) => image.isPrimary)?.url ??
    product.images[0]?.url
  );
}

export function CatalogBrowser() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('categoryId') ?? undefined;
  const search = searchParams.get('search') ?? '';
  const minPrice = searchParams.get('minPrice') ?? '';
  const maxPrice = searchParams.get('maxPrice') ?? '';

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState(search);
  const [minPriceDraft, setMinPriceDraft] = useState(minPrice);
  const [maxPriceDraft, setMaxPriceDraft] = useState(maxPrice);

  const filters = useMemo(
    () => ({ categoryId, search, minPrice, maxPrice }),
    [categoryId, search, minPrice, maxPrice],
  );

  useEffect(() => {
    setSearchDraft(search);
    setMinPriceDraft(minPrice);
    setMaxPriceDraft(maxPrice);
  }, [search, minPrice, maxPrice]);

  useEffect(() => {
    let active = true;
    void api
      .get<Category[]>('v1/categories', { skipAuth: true })
      .then((data) => active && setCategories(data))
      .catch(() => active && setError('Không thể tải danh mục.'));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.search) params.set('search', filters.search);
    if (filters.minPrice) params.set('minPrice', filters.minPrice);
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
    params.set('limit', '20');
    void api
      .get<ProductPage>(`v1/products?${params.toString()}`, { skipAuth: true })
      .then((page) => {
        if (!active) return;
        setProducts(page.data);
        setNextCursor(page.nextCursor);
      })
      .catch(() => active && setError('Không thể tải sản phẩm.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [filters]);

  const roots = categories.filter((category) => category.parentId === null);
  const childrenByParent = new Map<string, Category[]>();
  categories.forEach((category) => {
    if (!category.parentId) return;
    childrenByParent.set(category.parentId, [
      ...(childrenByParent.get(category.parentId) ?? []),
      category,
    ]);
  });

  const setFilters = (
    next: Partial<
      Record<'categoryId' | 'search' | 'minPrice' | 'maxPrice', string>
    >,
  ) => {
    const params = {
      categoryId: next.categoryId === undefined ? categoryId : next.categoryId,
      search: next.search === undefined ? search : next.search,
      minPrice: next.minPrice === undefined ? minPrice : next.minPrice,
      maxPrice: next.maxPrice === undefined ? maxPrice : next.maxPrice,
    };
    router.push(`${pathname}${queryString(params)}`);
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setFilters({ search: searchDraft.trim() });
  };

  const applyPrice = (event: FormEvent) => {
    event.preventDefault();
    const min = minPriceDraft.trim();
    const max = maxPriceDraft.trim();
    if (
      (min && (!Number.isInteger(Number(min)) || Number(min) < 0)) ||
      (max && (!Number.isInteger(Number(max)) || Number(max) < 0)) ||
      (min && max && Number(min) > Number(max))
    ) {
      setError('Khoảng giá không hợp lệ.');
      return;
    }
    setFilters({ minPrice: min, maxPrice: max });
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const params = new URLSearchParams();
    if (categoryId) params.set('categoryId', categoryId);
    if (search) params.set('search', search);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    params.set('cursor', nextCursor);
    params.set('limit', '20');
    try {
      const page = await api.get<ProductPage>(
        `v1/products?${params.toString()}`,
        {
          skipAuth: true,
        },
      );
      setProducts((current) => [...current, ...page.data]);
      setNextCursor(page.nextCursor);
    } catch {
      setError('Không thể tải thêm sản phẩm.');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <main className={styles.main}>
      <div className={`container ${styles.layout}`}>
        <aside className={styles.sidebar} aria-label="Danh mục sản phẩm">
          <h2>Danh mục</h2>
          <button
            className={!categoryId ? styles.activeCategory : ''}
            type="button"
            onClick={() => setFilters({ categoryId: '' })}
          >
            Tất cả sản phẩm
          </button>
          {roots.map((root) => (
            <div className={styles.categoryGroup} key={root.id}>
              <button
                className={categoryId === root.id ? styles.activeCategory : ''}
                type="button"
                onClick={() => setFilters({ categoryId: root.id })}
              >
                {root.name}
              </button>
              {(childrenByParent.get(root.id) ?? []).map((child) => (
                <button
                  className={`${styles.childCategory} ${categoryId === child.id ? styles.activeCategory : ''}`}
                  key={child.id}
                  type="button"
                  onClick={() => setFilters({ categoryId: child.id })}
                >
                  {child.name}
                </button>
              ))}
            </div>
          ))}
        </aside>

        <section className={styles.content}>
          <form className={styles.searchBar} onSubmit={submitSearch}>
            <input
              aria-label="Tìm sản phẩm"
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Tìm kiếm sản phẩm"
              value={searchDraft}
            />
            <button className="btn btn-primary" type="submit">
              Tìm kiếm
            </button>
          </form>
          <form className={styles.priceFilter} onSubmit={applyPrice}>
            <label>
              Giá từ
              <input
                inputMode="numeric"
                onChange={(event) => setMinPriceDraft(event.target.value)}
                placeholder="0"
                value={minPriceDraft}
              />
            </label>
            <label>
              đến
              <input
                inputMode="numeric"
                onChange={(event) => setMaxPriceDraft(event.target.value)}
                placeholder="Không giới hạn"
                value={maxPriceDraft}
              />
            </label>
            <button className="btn btn-outline" type="submit">
              Áp dụng
            </button>
          </form>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          {loading ? (
            <div className={styles.skeletonGrid} aria-label="Đang tải sản phẩm">
              {Array.from({ length: 8 }, (_, index) => (
                <div className="skeleton" key={index} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className={styles.empty}>Chưa tìm thấy sản phẩm phù hợp.</p>
          ) : (
            <>
              <div className={styles.grid}>
                {products.map((product) => {
                  const image = primaryImage(product);
                  return (
                    <Link
                      className={styles.card}
                      href={`/products/${product.id}`}
                      key={product.id}
                    >
                      <div className={styles.imageBox}>
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt={product.name} src={image} />
                        ) : (
                          <span aria-hidden="true">🛍️</span>
                        )}
                        {product.stock === 0 && (
                          <span className={styles.outOfStock}>Hết hàng</span>
                        )}
                      </div>
                      <h3>{product.name}</h3>
                      <div className={styles.prices}>
                        <span className="price">
                          {formatVnd(product.price)}
                        </span>
                        {product.comparePrice !== null &&
                          product.comparePrice > product.price && (
                            <span className="price-original">
                              {formatVnd(product.comparePrice)}
                            </span>
                          )}
                      </div>
                    </Link>
                  );
                })}
              </div>
              {nextCursor && (
                <div className={styles.more}>
                  <button
                    className="btn btn-outline"
                    disabled={loadingMore}
                    onClick={loadMore}
                    type="button"
                  >
                    {loadingMore ? 'Đang tải…' : 'Xem thêm'}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
