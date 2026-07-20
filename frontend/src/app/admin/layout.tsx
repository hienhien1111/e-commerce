import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <nav
        aria-label="Điều hướng quản trị"
        className="container"
        style={{ display: 'flex', gap: 16, paddingTop: 16 }}
      >
        <Link href="/admin/orders">Đơn hàng</Link>
        <span style={{ color: 'var(--color-text-muted)' }}>
          Dashboard (sắp có)
        </span>
        <span style={{ color: 'var(--color-text-muted)' }}>
          Sản phẩm (sắp có)
        </span>
        <span style={{ color: 'var(--color-text-muted)' }}>
          Coupons (sắp có)
        </span>
      </nav>
      {children}
    </>
  );
}
