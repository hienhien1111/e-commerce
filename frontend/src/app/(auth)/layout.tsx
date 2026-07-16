import React from 'react';
import Link from 'next/link';
import styles from './layout.module.css';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.authLayout}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link href="/" className={styles.logo}>
            Shop
          </Link>
          <span className={styles.title}>Đăng nhập</span>
        </div>
      </header>
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
