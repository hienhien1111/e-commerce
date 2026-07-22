'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatVnd, Product } from '@/lib/catalog';
import { useCart } from '@/providers/CartProvider';
import { useToast } from '@/providers/ToastProvider';
import { useSession } from '@/providers/SessionProvider';
import styles from './ProductDetail.module.css';

export function ProductDetail({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null);
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
    void api
      .get<Product>(`v1/products/${productId}`, { skipAuth: true })
      .then((result) => {
        if (!active) return;
        setProduct(result);
        const primaryIndex = result.images.findIndex(
          (image) => image.isPrimary,
        );
        setSelectedImage(primaryIndex >= 0 ? primaryIndex : 0);
        setSelectedVariantId(
          result.variants.find((variant) => variant.isActive)?.id ?? null,
        );
      })
      .catch(
        () => active && setError('Sản phẩm không tồn tại hoặc đã ngừng bán.'),
      );
    return () => {
      active = false;
    };
  }, [productId]);

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

  const selectedVariant =
    product.variants.find((variant) => variant.id === selectedVariantId) ??
    product.variants.find((variant) => variant.isActive) ??
    null;
  const image = product.images[selectedImage];
  const outOfStock = !selectedVariant || selectedVariant.stock === 0;
  const effectiveImage = selectedVariant?.imageUrl ?? image?.url ?? null;
  const effectivePrice = selectedVariant?.price ?? product.price;
  const effectiveComparePrice =
    selectedVariant?.comparePrice ?? product.comparePrice;
  const effectiveStock = selectedVariant?.stock ?? product.stock;

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
            {effectiveImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={product.name} src={effectiveImage} />
            ) : (
              <span aria-hidden="true">🛍️</span>
            )}
          </div>
          {product.images.length > 1 && (
            <div className={styles.thumbnails}>
              {product.images.map((item, index) => (
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
          {product.hasVariants && (
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
                    disabled={!variant.isActive || variant.stock === 0}
                    key={variant.id}
                    onClick={() => {
                      setSelectedVariantId(variant.id);
                      if (variant.imageUrl) {
                        const imageIndex = product.images.findIndex(
                          (image) => image.id === variant.imageId,
                        );
                        if (imageIndex >= 0) setSelectedImage(imageIndex);
                      }
                      setQuantity(1);
                    }}
                    type="button"
                  >
                    {variant.label ?? 'Mặc định'}
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
