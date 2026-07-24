'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CartIcon } from '@/components/cart/CartIcon';
import { useSession } from '@/providers/SessionProvider';
import { useToast } from '@/providers/ToastProvider';
import styles from './Header.module.css';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { user, logout } = useSession();
  const toast = useToast();
  const router = useRouter();
  const admin = user?.role?.name === 'admin';

  const displayName =
    [user?.lastName, user?.firstName].filter(Boolean).join(' ') ||
    user?.email ||
    'Tài khoản';

  const requestLogout = () => {
    setAccountOpen(false);
    setConfirmLogout(true);
  };

  const confirmLogoutAction = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setConfirmLogout(false);
      router.replace('/');
    } catch {
      toast.error(
        'Không thể đăng xuất lúc này. Phiên của bạn vẫn được giữ nguyên.',
      );
    } finally {
      setLoggingOut(false);
    }
  };

  const accountMenu = user && (
    <div className={styles.accountMenu}>
      <button
        aria-expanded={accountOpen}
        className={styles.accountButton}
        onClick={() => setAccountOpen((current) => !current)}
        type="button"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.avatar} src={user.avatarUrl} alt="" />
        ) : (
          <span className={styles.initial}>{displayName.slice(0, 1)}</span>
        )}
        <span>{displayName}</span>
      </button>
      {accountOpen && (
        <div className={styles.accountPopover}>
          <Link href="/profile" onClick={() => setAccountOpen(false)}>
            Hồ sơ
          </Link>
          {!admin && (
            <Link href="/orders" onClick={() => setAccountOpen(false)}>
              Đơn mua
            </Link>
          )}
          <button onClick={requestLogout} type="button">
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <header className={styles.header}>
        <div className={`container ${styles.content}`}>
          <Link
            href={admin ? '/admin' : '/'}
            className={styles.brand}
            aria-label={admin ? 'ShopApp quản trị' : 'ShopApp home'}
          >
            <span aria-hidden="true">🛍️</span>
            <span>{admin ? 'ShopApp Quản trị' : 'ShopApp'}</span>
          </Link>

          <button
            aria-expanded={menuOpen}
            aria-label="Mở menu"
            className={styles.menuButton}
            onClick={() => setMenuOpen((current) => !current)}
            type="button"
          >
            ☰
          </button>
          <nav
            className={`${styles.navigation} ${menuOpen ? styles.open : ''}`}
            aria-label="Điều hướng chính"
          >
            {admin ? (
              <>
                <Link href="/admin">Quản trị</Link>
                {accountMenu}
              </>
            ) : user ? (
              <>
                <Link href="/">Trang chủ</Link>
                <CartIcon />
                {accountMenu}
              </>
            ) : (
              <>
                <Link href="/">Trang chủ</Link>
                <Link href="/login">Đăng nhập</Link>
                <Link href="/register" className={styles.registerLink}>
                  Đăng ký
                </Link>
              </>
            )}
          </nav>
        </div>
        {!admin && (
          <nav className={styles.mobileBottom} aria-label="Điều hướng di động">
            <Link href="/">
              <span aria-hidden="true">⌂</span>
              Trang chủ
            </Link>
            <Link href="/#catalog-categories">
              <span aria-hidden="true">☷</span>
              Danh mục
            </Link>
            {user ? <CartIcon /> : <Link href="/login">Đăng nhập</Link>}
            {user && (
              <Link href="/orders">
                <span aria-hidden="true">▤</span>
                Đơn mua
              </Link>
            )}
            <Link href={user ? '/profile' : '/login'}>
              <span aria-hidden="true">◉</span>
              {user ? 'Tài khoản' : 'Đăng nhập'}
            </Link>
          </nav>
        )}
      </header>
      {confirmLogout && (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            aria-labelledby="logout-title"
            aria-modal="true"
            className={styles.logoutDialog}
            role="dialog"
          >
            <h2 id="logout-title">Đăng xuất?</h2>
            <p>Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng trang web.</p>
            <div className={styles.dialogActions}>
              <button
                className="btn btn-ghost"
                disabled={loggingOut}
                onClick={() => setConfirmLogout(false)}
                type="button"
              >
                Ở lại
              </button>
              <button
                className="btn btn-primary"
                disabled={loggingOut}
                onClick={() => void confirmLogoutAction()}
                type="button"
              >
                {loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
