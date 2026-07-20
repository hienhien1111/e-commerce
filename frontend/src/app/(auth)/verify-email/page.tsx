'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import styles from '../login/page.module.css';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const token = searchParams.get('token');
    const mode = searchParams.get('mode');
    if (!token) {
      setState('error');
      return;
    }

    void api
      .post<void>(
        mode === 'new-email' ? 'v1/email/confirm/new' : 'v1/email/confirm',
        { hash: token },
        { skipAuth: true },
      )
      .then(() => setState('success'))
      .catch(() => setState('error'));
  }, [searchParams]);

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>
        {state === 'loading'
          ? 'Đang xác nhận email...'
          : state === 'success'
            ? 'Email đã được xác nhận'
            : 'Liên kết không hợp lệ hoặc đã hết hạn'}
      </h1>
      {state === 'success' ? (
        <p className={styles.notice}>
          Bạn có thể đăng nhập bằng email mới nhất của mình.
        </p>
      ) : state === 'error' ? (
        <p className="form-error">Vui lòng yêu cầu một email xác nhận mới.</p>
      ) : null}
      {state !== 'loading' && (
        <div className={styles.footer}>
          <Link href="/login">Đến trang đăng nhập</Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className={styles.card} />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
