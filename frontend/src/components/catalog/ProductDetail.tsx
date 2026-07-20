'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatVnd, Product } from '@/lib/catalog';
import { useCart } from '@/providers/CartProvider';
import { useToast } from '@/providers/ToastProvider';
import styles from './ProductDetail.module.css';

export function ProductDetail({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const { addItem } = useCart();
  const toast = useToast();

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

  const image = product.images[selectedImage];
  const outOfStock = product.stock === 0;

  const addToCart = async () => {
    setAdding(true);
    setCartError(null);
    try {
      await addItem(product.id, quantity);
    } catch {
      setCartError('Không thể thêm sản phẩm vào giỏ. Vui lòng thử lại.');
      toast.error('Không thể thêm sản phẩm vào giỏ.');
    } finally {
      setAdding(false);
    }
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
          {product.sku && <p className={styles.sku}>SKU: {product.sku}</p>}
          <div className={styles.priceBox}>
            <strong>{formatVnd(product.price)}</strong>
            {product.comparePrice !== null &&
              product.comparePrice > product.price && (
                <span>{formatVnd(product.comparePrice)}</span>
              )}
          </div>
          {product.description && (
            <p className={styles.description}>{product.description}</p>
          )}
          <p className={outOfStock ? styles.stockEmpty : styles.stock}>
            {outOfStock ? 'Hết hàng' : `Còn ${product.stock} sản phẩm`}
          </p>
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
              disabled={quantity >= product.stock || outOfStock}
              onClick={() => setQuantity((current) => current + 1)}
              type="button"
            >
              +
            </button>
          </div>
          {cartError && <p className={styles.cartError}>{cartError}</p>}
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
              disabled
              title="Thanh toán sẽ khả dụng ở PR08"
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
