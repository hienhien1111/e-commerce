'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { auth, type AuthUser } from '@/lib/auth';
import { CartIcon } from '@/components/cart/CartIcon';
import styles from './Header.module.css';

export function Header() {
  // The server cannot read localStorage. Keep the first browser render equal
  // to the server render, then hydrate the cached session in an effect.
  const [user, setUser] = useState<AuthUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    setUser(auth.getUser());

    const loadCurrentUser = async () => {
      try {
        return await api.get<AuthUser>('v1/me', { skipAuth: true });
      } catch {
        await api.post<void>('v1/refresh', undefined, { skipAuth: true });
        return api.get<AuthUser>('v1/me', { skipAuth: true });
      }
    };

    void loadCurrentUser()
      .then((currentUser) => {
        if (!active) return;
        auth.setUser(currentUser);
        setUser(currentUser);
      })
      .catch(() => {
        if (!active) return;
        auth.logout();
        setUser(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const logout = async () => {
    try {
      await api.post<void>('v1/logout');
    } finally {
      auth.logout();
      setUser(null);
      router.replace('/');
    }
  };

  const displayName =
    [user?.lastName, user?.firstName].filter(Boolean).join(' ') ||
    user?.email ||
    'Tài khoản';

  return (
    <header className={styles.header}>
      <div className={`container ${styles.content}`}>
        <Link href="/" className={styles.brand} aria-label="ShopApp home">
          <span aria-hidden="true">🛍️</span>
          <span>ShopApp</span>
        </Link>

        <nav className={styles.navigation} aria-label="Điều hướng chính">
          <Link href="/">Trang chủ</Link>
          {user?.role?.name === 'admin' && (
            <Link href="/admin/orders">Quản trị</Link>
          )}
          <CartIcon />
          {user ? (
            <>
              <Link href="/profile" className={styles.accountLink}>
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.avatar} src={user.avatarUrl} alt="" />
                ) : (
                  <span className={styles.initial}>
                    {displayName.slice(0, 1)}
                  </span>
                )}
                <span>{displayName}</span>
              </Link>
              <button
                className={styles.logoutButton}
                type="button"
                onClick={logout}
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link href="/login">Đăng nhập</Link>
              <Link href="/register" className={styles.registerLink}>
                Đăng ký
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
