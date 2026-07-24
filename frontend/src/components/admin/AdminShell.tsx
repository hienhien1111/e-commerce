'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import styles from './AdminShell.module.css';

const navigation = [
  { href: '/admin', label: 'Tổng quan', icon: '⌂', exact: true },
  { href: '/admin/orders', label: 'Đơn hàng', icon: '▤', exact: false },
  { href: '/admin/products', label: 'Sản phẩm', icon: '□', exact: false },
  { href: '/admin/categories', label: 'Danh mục', icon: '◇', exact: false },
  { href: '/admin/coupons', label: 'Khuyến mãi', icon: '%', exact: false },
  { href: '/admin/users', label: 'Người dùng', icon: '◎', exact: false },
  { href: '/admin/operations', label: 'Vận hành', icon: '↻', exact: false },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const active = useMemo(
    () =>
      [...navigation]
        .reverse()
        .find((item) =>
          item.exact ? pathname === item.href : pathname.startsWith(item.href),
        ) ?? navigation[0],
    [pathname],
  );

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const fallbackFocus = menuButtonRef.current;
    const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const activeLink = drawerRef.current?.querySelector<HTMLElement>(
      '[aria-current="page"]',
    );
    (activeLink ?? focusable?.[0])?.focus();

    return () => {
      (previousFocus ?? fallbackFocus)?.focus();
    };
  }, [open]);

  const trapDrawerFocus = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (!open) return;
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className={`${styles.shell} ${collapsed ? styles.shellCollapsed : ''}`}
    >
      <button
        aria-label="Đóng menu quản trị"
        className={`${styles.backdrop} ${open ? styles.backdropOpen : ''}`}
        onClick={() => setOpen(false)}
        type="button"
      />
      <aside
        aria-label="Điều hướng quản trị"
        className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''} ${
          collapsed ? styles.sidebarCollapsed : ''
        }`}
        onKeyDown={trapDrawerFocus}
        ref={drawerRef}
      >
        <div className={styles.brand}>
          <span className={styles.brandMark}>S</span>
          <span className={styles.brandText}>
            <strong>Shop Admin</strong>
            <small>Trung tâm vận hành</small>
          </span>
          <button
            aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
            className={styles.collapseButton}
            onClick={() => setCollapsed((current) => !current)}
            type="button"
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>
        <nav aria-label="Điều hướng quản trị" className={styles.navigation}>
          {navigation.map((item) => {
            const selected = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                aria-current={selected ? 'page' : undefined}
                aria-label={item.label}
                className={selected ? styles.active : undefined}
                href={item.href}
                key={item.href}
                title={collapsed ? item.label : undefined}
              >
                <span aria-hidden="true" className={styles.navIcon}>
                  {item.icon}
                </span>
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className={styles.sidebarFooter}>
          <Link href="/">← Về cửa hàng</Link>
          <a
            href="http://localhost:3002/api/docs"
            rel="noreferrer"
            target="_blank"
          >
            Swagger API ↗
          </a>
        </div>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <button
            aria-expanded={open}
            aria-label="Mở menu quản trị"
            className={styles.menuButton}
            onClick={() => setOpen(true)}
            ref={menuButtonRef}
            type="button"
          >
            <span />
            <span />
            <span />
          </button>
          <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
            {pathname !== '/admin' ? (
              <>
                <Link href="/admin">Quản trị</Link>
                <span aria-hidden="true">/</span>
              </>
            ) : null}
            <strong>{active.label}</strong>
          </nav>
          <span className={styles.status}>
            <i aria-hidden="true" />
            Hệ thống trực tuyến
          </span>
        </header>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
