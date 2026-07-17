'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import styles from '../login/page.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      await api.post<void>('v1/forgot/password', { email }, { skipAuth: true });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Quên mật khẩu</h1>
      {submitted ? (
        <p className={styles.notice}>
          Nếu email tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu.
        </p>
      ) : (
        <form onSubmit={submit}>
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
            {loading ? 'Đang gửi...' : 'Gửi liên kết đặt lại'}
          </button>
        </form>
      )}
      <div className={styles.footer}>
        <Link href="/login">Quay lại đăng nhập</Link>
      </div>
    </div>
  );
}
