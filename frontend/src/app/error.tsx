'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => undefined, []);
  return (
    <main className="container" style={{ paddingTop: 80, textAlign: 'center' }}>
      <h1>Đã có lỗi xảy ra</h1>
      <p style={{ margin: '12px 0 20px' }}>
        Vui lòng thử lại hoặc quay về trang chủ.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
        <button className="btn btn-primary" onClick={reset} type="button">
          Thử lại
        </button>
        <Link className="btn btn-outline" href="/">
          Trang chủ
        </Link>
      </div>
    </main>
  );
}
