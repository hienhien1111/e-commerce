import { formatVnd } from '@/lib/catalog';
import { Order } from '@/lib/order';
import styles from './OrderScreens.module.css';

export function OrderItems({ order }: { order: Order }) {
  return (
    <ul className={styles.items}>
      {order.items.map((item) => (
        <li className={styles.item} key={item.id}>
          <div className={styles.image}>
            {item.snapshot.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="" src={item.snapshot.imageUrl} />
            ) : (
              <span aria-hidden="true">🛍️</span>
            )}
          </div>
          <div className={styles.itemInfo}>
            <strong>{item.snapshot.name}</strong>
            {item.snapshot.variantLabel && (
              <span className={styles.muted}>{item.snapshot.variantLabel}</span>
            )}
            {item.snapshot.sku && (
              <span className={styles.muted}>SKU: {item.snapshot.sku}</span>
            )}
            <span className={styles.muted}>
              {item.quantity} × {formatVnd(item.unitPrice)}
            </span>
          </div>
          <strong className="price">{formatVnd(item.totalPrice)}</strong>
        </li>
      ))}
    </ul>
  );
}

export function OrderTotals({ order }: { order: Order }) {
  return (
    <dl className={styles.totals}>
      <div>
        <dt>Tạm tính</dt>
        <dd>{formatVnd(order.subtotal)}</dd>
      </div>
      <div>
        <dt>Giảm giá</dt>
        <dd>−{formatVnd(order.discountAmount)}</dd>
      </div>
      <div className={styles.grand}>
        <dt>Tổng thanh toán</dt>
        <dd>{formatVnd(order.total)}</dd>
      </div>
    </dl>
  );
}
