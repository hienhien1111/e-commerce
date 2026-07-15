import Link from 'next/link';
import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.content}`}>
        <Link href="/" className={styles.brand} aria-label="ShopApp home">
          <span aria-hidden="true">🛍️</span>
          <span>ShopApp</span>
        </Link>

        <nav className={styles.navigation} aria-label="Điều hướng chính">
          <Link href="/">Trang chủ</Link>
          <Link href="/login">Đăng nhập</Link>
          <Link href="/register" className={styles.registerLink}>
            Đăng ký
          </Link>
        </nav>
      </div>
    </header>
  );
}
