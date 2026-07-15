import styles from './page.module.css';

export default function HomePage() {
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <div className={styles.logo}>🛍️</div>
        <h1 className={styles.title}>ShopApp</h1>
        <p className={styles.subtitle}>Đang xây dựng tính năng...</p>
        <div className={styles.links}>
          <a href="/login" className="btn btn-primary">Đăng nhập</a>
          <a href="/register" className="btn btn-outline">Đăng ký</a>
        </div>
      </div>
    </main>
  );
}
