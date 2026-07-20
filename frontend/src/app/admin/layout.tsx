import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import styles from '@/components/admin/AdminScreens.module.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requireAdmin>
      <nav
        aria-label="Điều hướng quản trị"
        className={`container ${styles.adminNav}`}
      >
        <Link href="/admin">Dashboard</Link>
        <Link href="/admin/products">Sản phẩm</Link>
        <Link href="/admin/categories">Danh mục</Link>
        <Link href="/admin/orders">Đơn hàng</Link>
        <Link href="/admin/coupons">Coupons</Link>
        <Link href="/admin/users">Người dùng</Link>
      </nav>
      {children}
    </AuthGuard>
  );
}
