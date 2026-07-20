import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container" style={{ paddingTop: 80, textAlign: 'center' }}>
      <h1>Không tìm thấy trang</h1>
      <p style={{ margin: '12px 0 20px' }}>
        Liên kết có thể đã thay đổi hoặc không còn tồn tại.
      </p>
      <Link className="btn btn-primary" href="/">
        Về trang chủ
      </Link>
    </main>
  );
}
