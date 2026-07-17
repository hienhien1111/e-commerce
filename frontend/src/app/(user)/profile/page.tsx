'use client';

import { ChangeEvent, FormEvent, useRef, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { api, ApiError, getValidationError } from '@/lib/api';
import { auth, type AuthUser } from '@/lib/auth';
import styles from './page.module.css';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png']);
const VIETNAMESE_MOBILE_PATTERN = /^0(?:3|5|7|8|9)\d{8}$/;

type ProfileUser = AuthUser & {
  phone: string | null;
  avatarUrl: string | null;
};

function normalizePhone(value: string): string {
  return value.trim().replace(/[\s.-]/g, '');
}

function getInitials(user: ProfileUser): string {
  const name = [user.lastName, user.firstName]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .trim();
  return (name || user.email || 'U').slice(0, 1).toUpperCase();
}

function getRequestError(
  error: unknown,
  fallback: string,
  field = 'phone',
): string {
  if (error instanceof ApiError) {
    return getValidationError(error, field) ?? fallback;
  }

  return fallback;
}

function ProfileContent() {
  const [profile, setProfile] = useState<ProfileUser | null>(() => {
    return auth.getUser() as ProfileUser | null;
  });
  const [firstName, setFirstName] = useState(profile?.firstName ?? '');
  const [lastName, setLastName] = useState(profile?.lastName ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [avatarPreview, setAvatarPreview] = useState(
    profile?.avatarUrl ?? null,
  );
  const [profileError, setProfileError] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [saved, setSaved] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [newEmail, setNewEmail] = useState(profile?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const previewObjectUrl = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const applyProfile = (updatedProfile: ProfileUser) => {
    auth.setUser(updatedProfile);
    setProfile(updatedProfile);
    setFirstName(updatedProfile.firstName ?? '');
    setLastName(updatedProfile.lastName ?? '');
    setPhone(updatedProfile.phone ?? '');
    setNewEmail(updatedProfile.email ?? '');
  };

  const handleResendVerification = async () => {
    if (!profile?.email) return;
    setResendingVerification(true);
    setVerificationMessage('');
    try {
      await api.post<void>(
        'v1/email/confirm/resend',
        { email: profile.email },
        { skipAuth: true },
      );
      setVerificationMessage(
        'Nếu tài khoản cần xác nhận, email mới đã được gửi.',
      );
    } catch {
      setVerificationMessage('Không thể gửi email lúc này. Vui lòng thử lại.');
    } finally {
      setResendingVerification(false);
    }
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError('');
    setSaved(false);

    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone && !VIETNAMESE_MOBILE_PATTERN.test(normalizedPhone)) {
      setProfileError(
        'Số điện thoại phải là số di động Việt Nam gồm 10 chữ số.',
      );
      return;
    }

    setSaving(true);
    try {
      const updatedProfile = await api.patch<ProfileUser>('v1/me', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: normalizedPhone || null,
      });
      applyProfile(updatedProfile);
      setSaved(true);
    } catch (error: unknown) {
      setProfileError(
        getRequestError(error, 'Không thể cập nhật hồ sơ. Vui lòng thử lại.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEmailChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailError('');
    setEmailMessage('');
    if (!newEmail || !currentPassword) {
      setEmailError('Nhập email mới và mật khẩu hiện tại.');
      return;
    }

    setChangingEmail(true);
    try {
      await api.post<void>('v1/me/email-change', {
        email: newEmail.trim(),
        currentPassword,
      });
      setCurrentPassword('');
      setEmailMessage('Chúng tôi đã gửi liên kết xác nhận đến email mới.');
    } catch (error: unknown) {
      setEmailError(
        getRequestError(error, 'Không thể yêu cầu đổi email.', 'email'),
      );
    } finally {
      setChangingEmail(false);
    }
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    setAvatarError('');
    if (!ACCEPTED_AVATAR_TYPES.has(file.type)) {
      setAvatarError('Chỉ hỗ trợ ảnh JPEG hoặc PNG.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError('Ảnh đại diện không được lớn hơn 2 MiB.');
      event.target.value = '';
      return;
    }

    if (previewObjectUrl.current) {
      URL.revokeObjectURL(previewObjectUrl.current);
    }
    const localPreview = URL.createObjectURL(file);
    previewObjectUrl.current = localPreview;
    setAvatarPreview(localPreview);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const updatedProfile = await api.upload<ProfileUser>(
        'v1/me/avatar',
        formData,
      );
      applyProfile(updatedProfile);
      setAvatarPreview(updatedProfile.avatarUrl);
      URL.revokeObjectURL(localPreview);
      previewObjectUrl.current = null;
    } catch (error: unknown) {
      setAvatarPreview(profile.avatarUrl);
      setAvatarError(
        getRequestError(error, 'Không thể tải ảnh đại diện. Vui lòng thử lại.'),
      );
      URL.revokeObjectURL(localPreview);
      previewObjectUrl.current = null;
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  if (!profile) {
    return null;
  }

  return (
    <main className={styles.main}>
      <section
        className={`card ${styles.card}`}
        aria-labelledby="profile-title"
      >
        <header className={styles.heading}>
          <h1 id="profile-title">Hồ sơ của tôi</h1>
          <p>Quản lý thông tin hồ sơ để mua hàng thuận tiện hơn.</p>
        </header>

        <div className={styles.content}>
          <div className={styles.avatarSection}>
            <div className={styles.avatar}>
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="Ảnh đại diện" />
              ) : (
                <span aria-hidden="true">{getInitials(profile)}</span>
              )}
            </div>
            <label className={`btn btn-outline ${styles.uploadButton}`}>
              {uploading ? 'Đang tải...' : 'Chọn ảnh'}
              <input
                ref={fileInput}
                className={styles.fileInput}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleAvatarChange}
                disabled={uploading}
              />
            </label>
            <p className={styles.avatarHint}>JPEG hoặc PNG, tối đa 2 MiB</p>
            {avatarError && <p className="form-error">{avatarError}</p>}
          </div>

          <form className={styles.form} onSubmit={handleProfileSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="profile-email">
                Email
              </label>
              <input
                id="profile-email"
                className="form-input"
                value={profile.email ?? ''}
                readOnly
                aria-readonly="true"
              />
              {profile.verifiedAt ? (
                <p className={styles.verified}>Email đã được xác nhận.</p>
              ) : (
                <div className={styles.verificationAction}>
                  <span>Email chưa được xác nhận.</span>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                  >
                    {resendingVerification ? 'Đang gửi...' : 'Gửi lại email'}
                  </button>
                </div>
              )}
              {verificationMessage && (
                <p className={styles.emailMessage}>{verificationMessage}</p>
              )}
            </div>

            <div className={styles.nameFields}>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-last-name">
                  Họ
                </label>
                <input
                  id="profile-last-name"
                  className="form-input"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-first-name">
                  Tên
                </label>
                <input
                  id="profile-first-name"
                  className="form-input"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="profile-phone">
                Số điện thoại
              </label>
              <input
                id="profile-phone"
                className="form-input"
                value={phone}
                inputMode="numeric"
                placeholder="0901234567"
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>

            {profileError && <p className="form-error">{profileError}</p>}
            {saved && <p className={styles.saved}>Đã cập nhật hồ sơ.</p>}
            <button
              className={`btn btn-primary ${styles.saveButton}`}
              type="submit"
              disabled={saving}
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </form>

          <section className={`${styles.form} ${styles.emailChangeForm}`}>
            <h2>Đổi địa chỉ email</h2>
            {profile.provider === 'email' ? (
              <form onSubmit={handleEmailChange}>
                <p className={styles.sectionHint}>
                  Email mới chỉ được áp dụng sau khi bạn xác nhận qua liên kết
                  gửi đến địa chỉ đó.
                </p>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-email">
                    Email mới
                  </label>
                  <input
                    id="new-email"
                    className="form-input"
                    type="email"
                    value={newEmail}
                    onChange={(event) => setNewEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="current-password">
                    Mật khẩu hiện tại
                  </label>
                  <input
                    id="current-password"
                    className="form-input"
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    required
                  />
                </div>
                {emailError && <p className="form-error">{emailError}</p>}
                {emailMessage && (
                  <p className={styles.emailMessage}>{emailMessage}</p>
                )}
                <button
                  className={`btn btn-outline ${styles.saveButton}`}
                  type="submit"
                  disabled={changingEmail}
                >
                  {changingEmail ? 'Đang gửi...' : 'Xác nhận đổi email'}
                </button>
              </form>
            ) : (
              <p className={styles.sectionHint}>
                Tài khoản Google quản lý địa chỉ email qua Google.
              </p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}
