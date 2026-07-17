// ============================================================
// Auth profile cache — session tokens stay in HttpOnly cookies
// ============================================================

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: { name: string } | null;
}

const USER_KEY = 'auth_user';

export const auth = {
  setUser(user: AuthUser): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
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
    return !!auth.getUser();
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
