'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatVnd } from '@/lib/catalog';
import type {
  CatalogV2Option,
  CatalogV2Product,
  CatalogV2Variant,
} from '@/lib/catalog-v2';
import { useCart } from '@/providers/CartProvider';
import { useToast } from '@/providers/ToastProvider';
import { useSession } from '@/providers/SessionProvider';
import styles from './ProductDetail.module.css';

const sellable = (variant: CatalogV2Variant) => variant.status === 'ACTIVE';

function matchingVariant(
  variants: CatalogV2Variant[],
  options: CatalogV2Option[],
  nextValueId: string,
  changedOptionId: string,
  selected: CatalogV2Variant | null,
) {
  return variants.find(
    (variant) =>
      sellable(variant) &&
      options.every((option) => {
        const expected =
          option.id === changedOptionId
            ? nextValueId
            : selected?.optionValueIds.find((id) =>
                option.values.some((value) => value.id === id),
              );
        return !expected || variant.optionValueIds.includes(expected);
      }),
  );
}

export function ProductDetail({ productId }: { productId: string }) {
  const [product, setProduct] = useState<CatalogV2Product | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null,
  );
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const { addItem } = useCart();
  const { user } = useSession();
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    let active = true;
    setError(null);
    void api
      .get<CatalogV2Product>(`v2/products/${productId}`, { skipAuth: true })
      .then((result) => {
        if (!active) return;
        setProduct(result);
        setSelectedImage(0);
        setSelectedVariantId(
          result.variants.find(
            (variant) => sellable(variant) && variant.availableQuantity > 0,
          )?.id ??
            result.variants.find(sellable)?.id ??
            null,
        );
        setQuantity(1);
      })
      .catch(
        () => active && setError('Sản phẩm không tồn tại hoặc đã ngừng bán.'),
      );
    return () => {
      active = false;
    };
  }, [productId]);

  const selectedVariant = useMemo(
    () =>
      product?.variants.find((variant) => variant.id === selectedVariantId) ??
      product?.variants.find(sellable) ??
      null,
    [product, selectedVariantId],
  );
  const gallery =
    selectedVariant && selectedVariant.media.length > 0
      ? selectedVariant.media
      : (product?.media ?? []);

  if (error) {
    return (
      <main className={styles.message}>
        <p>{error}</p>
        <Link href="/">Quay lại catalog</Link>
      </main>
    );
  }
  if (!product)
    return (
      <main className={styles.message}>
        <div className="skeleton" />
      </main>
    );

  const image = gallery[selectedImage] ?? gallery[0] ?? null;
  const outOfStock =
    !selectedVariant ||
    !sellable(selectedVariant) ||
    selectedVariant.availableQuantity === 0;
  const effectivePrice = selectedVariant?.price ?? product.summary.priceMin;
  const effectiveComparePrice = selectedVariant?.comparePrice ?? null;
  const effectiveStock = selectedVariant?.availableQuantity ?? 0;

  const selectValue = (option: CatalogV2Option, valueId: string) => {
    const match = matchingVariant(
      product.variants,
      product.options,
      valueId,
      option.id,
      selectedVariant,
    );
    if (!match) return;
    setSelectedVariantId(match.id);
    setSelectedImage(0);
    setQuantity(1);
  };

  const addToCart = async () => {
    if (!user) {
      setNeedsLogin(true);
      setCartError('Đăng nhập để thêm sản phẩm vào giỏ hàng.');
      return;
    }
    setAdding(true);
    setNeedsLogin(false);
    setCartError(null);
    try {
      if (!selectedVariant) throw new Error('Hãy chọn mẫu mã sản phẩm.');
      await addItem(selectedVariant.id, quantity);
    } catch {
      setCartError('Không thể thêm sản phẩm vào giỏ. Vui lòng thử lại.');
      toast.error('Không thể thêm sản phẩm vào giỏ.');
    } finally {
      setAdding(false);
    }
  };

  const buyNow = () => {
    if (!user) {
      setNeedsLogin(true);
      setCartError('Đăng nhập để mua sản phẩm ngay.');
      return;
    }
    router.push(
      `/checkout?productId=${encodeURIComponent(product.id)}&variantId=${encodeURIComponent(selectedVariant?.id ?? '')}&quantity=${quantity}`,
    );
  };

  return (
    <main className={styles.main}>
      <div className={`container ${styles.detail}`}>
        <section className={styles.gallery}>
          <div className={styles.mainImage}>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={product.name} src={image.url} />
            ) : (
              <span aria-hidden="true">🛍️</span>
            )}
          </div>
          {gallery.length > 1 && (
            <div className={styles.thumbnails}>
              {gallery.map((item, index) => (
                <button
                  aria-label={`Xem ảnh ${index + 1}`}
                  className={
                    index === selectedImage ? styles.selectedThumbnail : ''
                  }
                  key={item.id}
                  onClick={() => setSelectedImage(index)}
                  type="button"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="" src={item.url} />
                </button>
              ))}
            </div>
          )}
        </section>
        <section className={styles.info}>
          <h1>{product.name}</h1>
          {selectedVariant?.sku && (
            <p className={styles.sku}>SKU: {selectedVariant.sku}</p>
          )}
          <div className={styles.priceBox}>
            <strong>{formatVnd(effectivePrice)}</strong>
            {effectiveComparePrice !== null &&
              effectiveComparePrice > effectivePrice && (
                <span>{formatVnd(effectiveComparePrice)}</span>
              )}
          </div>
          {product.description && (
            <p className={styles.description}>{product.description}</p>
          )}
          <p className={outOfStock ? styles.stockEmpty : styles.stock}>
            {outOfStock ? 'Hết hàng' : `Còn ${effectiveStock} sản phẩm`}
          </p>
          {product.options.map((option) => (
            <div className={styles.quantity} key={option.id}>
              <span>{option.name}</span>
              <div className={styles.variantChoices}>
                {option.values.map((value) => {
                  const candidate = matchingVariant(
                    product.variants,
                    product.options,
                    value.id,
                    option.id,
                    selectedVariant,
                  );
                  const isSelected = selectedVariant?.optionValueIds.includes(
                    value.id,
                  );
                  return (
                    <button
                      className={isSelected ? styles.selectedVariant : ''}
                      disabled={!candidate || candidate.availableQuantity === 0}
                      key={value.id}
                      onClick={() => selectValue(option, value.id)}
                      type="button"
                    >
                      {value.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {product.options.length === 0 && product.variants.length > 1 && (
            <div className={styles.quantity}>
              <span>Mẫu mã</span>
              <div className={styles.variantChoices}>
                {product.variants.map((variant) => (
                  <button
                    className={
                      variant.id === selectedVariant?.id
                        ? styles.selectedVariant
                        : ''
                    }
                    disabled={
                      !sellable(variant) || variant.availableQuantity === 0
                    }
                    key={variant.id}
                    onClick={() => {
                      setSelectedVariantId(variant.id);
                      setSelectedImage(0);
                      setQuantity(1);
                    }}
                    type="button"
                  >
                    {variant.sku}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className={styles.quantity}>
            <span>Số lượng</span>
            <button
              disabled={quantity <= 1 || outOfStock}
              onClick={() => setQuantity((current) => current - 1)}
              type="button"
            >
              −
            </button>
            <output>{quantity}</output>
            <button
              disabled={quantity >= effectiveStock || outOfStock}
              onClick={() => setQuantity((current) => current + 1)}
              type="button"
            >
              +
            </button>
          </div>
          {cartError && (
            <p className={styles.cartError}>
              {cartError}{' '}
              {needsLogin && (
                <Link
                  href={`/login?redirect=${encodeURIComponent(`/products/${product.id}`)}`}
                >
                  Đăng nhập
                </Link>
              )}
            </p>
          )}
          <div className={styles.actions}>
            <button
              className="btn btn-outline"
              disabled={outOfStock || adding}
              onClick={() => void addToCart()}
              type="button"
            >
              {adding ? 'Đang thêm…' : 'Thêm vào giỏ'}
            </button>
            <button
              className="btn btn-primary"
              disabled={outOfStock || adding}
              onClick={buyNow}
              type="button"
            >
              Mua ngay
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
