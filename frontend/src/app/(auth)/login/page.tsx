'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { auth, type AuthUser } from '@/lib/auth';
import { api, apiUrl, getValidationError } from '@/lib/api';
import styles from './page.module.css';

function getRedirectPath(value: string | null): string {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/profile';
}

function getGoogleErrorMessage(code: string): string {
  if (code === 'use_email_login') {
    return 'Email này đã đăng ký bằng mật khẩu. Vui lòng đăng nhập bằng email.';
  }

  return 'Đăng nhập với Google thất bại. Vui lòng thử lại.';
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const handledOAuth = useRef(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (handledOAuth.current) return;

    const oauthError = searchParams.get('error');
    if (oauthError) {
      handledOAuth.current = true;
      window.history.replaceState(null, '', '/login');
      setError(getGoogleErrorMessage(oauthError));
      return;
    }
  }, [searchParams]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setUnverifiedEmail('');
    setLoading(true);

    try {
      const user = await api.post<AuthUser>(
        'v1/email/login',
        { email, password },
        { skipAuth: true },
      );
      auth.setUser(user);
      window.location.replace(getRedirectPath(searchParams.get('redirect')));
    } catch (requestError: unknown) {
      const providerError = getValidationError(requestError, 'email');
      if (providerError === 'emailNotVerified') {
        setUnverifiedEmail(email);
      }
      setError(
        providerError === 'emailNotVerified'
          ? 'Bạn cần xác nhận email trước khi đăng nhập.'
          : providerError?.startsWith('needLoginViaProvider')
            ? 'Tài khoản này cần đăng nhập bằng phương thức đã đăng ký.'
            : 'Email hoặc mật khẩu không đúng',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.assign(apiUrl('v1/google'));
  };

  const registered = searchParams.get('registered') === 'true';

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Đăng nhập</h1>

      {registered && (
        <p className={styles.notice}>
          Đăng ký thành công. Bạn có thể đăng nhập ngay bây giờ.
        </p>
      )}
      {error && (
        <div
          className="form-error"
          style={{ marginBottom: 16, textAlign: 'center' }}
        >
          {error}
        </div>
      )}
      {unverifiedEmail && (
        <p className={styles.notice}>
          <Link
            href={`/check-email?email=${encodeURIComponent(unverifiedEmail)}`}
          >
            Gửi lại email xác nhận
          </Link>
        </p>
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
        Đăng nhập với Google
      </button>

      <div className={styles.divider}>HOẶC</div>

      <form onSubmit={handleLogin}>
        <div className="form-group">
          <input
            type="email"
            className="form-input"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <div className={styles.passwordField}>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Mật khẩu"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
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

        <button
          type="submit"
          className={`btn btn-primary ${styles.submitBtn}`}
          disabled={loading}
        >
          {loading ? 'Đang đăng nhập...' : 'ĐĂNG NHẬP'}
        </button>
      </form>

      <div className={styles.footer}>
        Bạn mới biết đến Shop? <Link href="/register">Đăng ký</Link>
      </div>
      <div className={styles.footer}>
        <Link href="/forgot-password">Quên mật khẩu?</Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className={styles.card} />}>
      <LoginForm />
    </Suspense>
  );
}
