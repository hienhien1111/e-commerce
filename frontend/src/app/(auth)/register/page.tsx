'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, apiUrl, getValidationError } from '@/lib/api';
import styles from '../login/page.module.css';

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const passwordsMatch =
    confirmPassword.length === 0 || password === confirmPassword;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Mật khẩu cần có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại chưa khớp.');
      return;
    }
    setLoading(true);

    try {
      await api.post<void>('v1/email/register', {
        firstName,
        lastName,
        email,
        password,
      });
      router.push(`/check-email?email=${encodeURIComponent(email)}`);
    } catch (error: unknown) {
      if (getValidationError(error, 'email') === 'emailAlreadyExists') {
        setError('Email này đã được sử dụng');
      } else {
        setError('Đăng ký thất bại. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.assign(apiUrl('v1/google'));
  };

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Đăng ký</h1>
      {error && (
        <div
          className="form-error"
          style={{ marginBottom: 16, textAlign: 'center' }}
        >
          {error}
        </div>
      )}

      <button
        className={styles.googleBtn}
        onClick={handleGoogleLogin}
        type="button"
        disabled={loading}
      >
        <svg className={styles.googleIcon} viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Đăng ký với Google
      </button>

      <div className={styles.divider}>HOẶC</div>

      <form onSubmit={handleRegister} noValidate>
        <div className={styles.nameFields}>
          <div className="form-group">
            <label className="form-label" htmlFor="register-last-name">
              Họ
            </label>
            <input
              id="register-last-name"
              type="text"
              className="form-input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="register-first-name">
              Tên
            </label>
            <input
              id="register-first-name"
              type="text"
              className="form-input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="register-email">
            Email
          </label>
          <input
            id="register-email"
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="register-password">
            Mật khẩu
          </label>
          <div className={styles.passwordField}>
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              aria-describedby="register-password-hint"
              required
              minLength={6}
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
          <p id="register-password-hint" className={styles.passwordHint}>
            Ít nhất 6 ký tự.
          </p>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="register-confirm-password">
            Nhập lại mật khẩu
          </label>
          <div className={styles.passwordField}>
            <input
              id="register-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              aria-invalid={!passwordsMatch}
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
          {confirmPassword && !passwordsMatch && (
            <p className="form-error">Mật khẩu nhập lại chưa khớp.</p>
          )}
        </div>

        <button
          type="submit"
          className={`btn btn-primary ${styles.submitBtn}`}
          disabled={loading}
        >
          {loading ? 'Đang đăng ký...' : 'ĐĂNG KÝ'}
        </button>
      </form>

      <div className={styles.footer}>
        Bạn đã có tài khoản? <Link href="/login">Đăng nhập</Link>
      </div>
    </div>
  );
}
