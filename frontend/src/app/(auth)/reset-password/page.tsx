'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import styles from '../login/page.module.css';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = searchParams.get('token');
    if (!token || password.length < 6 || password !== confirmPassword) {
      setError('Mật khẩu phải khớp và có ít nhất 6 ký tự.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post<void>(
        'v1/reset/password',
        { hash: token, password },
        { skipAuth: true },
      );
      setSuccess(true);
    } catch {
      setError('Liên kết không hợp lệ hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Đặt lại mật khẩu</h1>
      {success ? (
        <p className={styles.notice}>
          Mật khẩu đã được đặt lại. Hãy đăng nhập lại.
        </p>
      ) : (
        <form onSubmit={submit}>
          <div className="form-group">
            <div className={styles.passwordField}>
              <input
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mật khẩu mới"
                autoComplete="new-password"
                required
              />
              <button
                className={styles.passwordToggle}
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
              >
                {showPassword ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
          </div>
          <div className="form-group">
            <div className={styles.passwordField}>
              <input
                className="form-input"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                autoComplete="new-password"
                required
              />
              <button
                className={styles.passwordToggle}
                type="button"
                onClick={() => setShowConfirmPassword((visible) => !visible)}
                aria-label={
                  showConfirmPassword
                    ? 'Ẩn mật khẩu nhập lại'
                    : 'Hiển thị mật khẩu nhập lại'
                }
              >
                {showConfirmPassword ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
          </div>
          {error && <p className="form-error">{error}</p>}
          <button
            className={`btn btn-primary ${styles.submitBtn}`}
            disabled={loading}
            type="submit"
          >
            {loading ? 'Đang lưu...' : 'Đặt lại mật khẩu'}
          </button>
        </form>
      )}
      {(success || error) && (
        <div className={styles.footer}>
          <Link href="/login">Đến trang đăng nhập</Link>
        </div>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className={styles.card} />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
