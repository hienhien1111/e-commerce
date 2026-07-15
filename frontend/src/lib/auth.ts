// ============================================================
// Auth token management — client-side only
// ============================================================

export interface AuthTokens {
  token: string;
  refreshToken: string;
  tokenExpires: number;
}

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  role: { name: string } | null;
}

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'auth_user';

export const auth = {
  setTokens(tokens: AuthTokens): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.token);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },

  setUser(user: AuthUser): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  getUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  isLoggedIn(): boolean {
    return !!auth.getAccessToken();
  },

  isAdmin(): boolean {
    const user = auth.getUser();
    return user?.role?.name === 'admin';
  },

  isCustomer(): boolean {
    const user = auth.getUser();
    return user?.role?.name === 'customer';
  },

  logout(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getDisplayName(): string {
    const user = auth.getUser();
    if (!user) return 'Khách';
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return name || user.email || 'Người dùng';
  },
};

export default auth;
