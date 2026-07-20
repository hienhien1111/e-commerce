'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import styles from '../login/page.module.css';

function CheckEmailForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [message, setMessage] = useState(
    'Tài khoản đã được tạo. Kiểm tra hộp thư để xác nhận email trước khi đăng nhập.',
  );
  const [loading, setLoading] = useState(false);

  const resend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      await api.post<void>(
        'v1/email/confirm/resend',
        { email },
        { skipAuth: true },
      );
      setMessage('Nếu tài khoản cần xác nhận, email mới đã được gửi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Kiểm tra email</h1>
      <p className={styles.notice}>{message}</p>
      <p className={styles.emailHelp}>
        Không thấy email? Kiểm tra thư rác hoặc gửi lại liên kết xác nhận.
      </p>
      <form onSubmit={resend}>
        <div className="form-group">
          <input
            className="form-input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            required
          />
        </div>
        <button
          className={`btn btn-primary ${styles.submitBtn}`}
          disabled={loading}
          type="submit"
        >
          {loading ? 'Đang gửi...' : 'Gửi lại email xác nhận'}
        </button>
      </form>
      <div className={styles.footer}>
        <Link href="/login">Quay lại đăng nhập</Link>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<div className={styles.card} />}>
      <CheckEmailForm />
    </Suspense>
  );
}
