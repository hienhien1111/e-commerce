'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ApiError, api } from '@/lib/api';
import { auth, type AuthUser } from '@/lib/auth';

type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

type SessionContextValue = {
  status: SessionStatus;
  user: AuthUser | null;
  refresh: () => Promise<AuthUser | null>;
  setUser: (user: AuthUser) => void;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [user, setCurrentUser] = useState<AuthUser | null>(null);

  const applyUser = useCallback((nextUser: AuthUser) => {
    auth.setUser(nextUser);
    setCurrentUser(nextUser);
    setStatus('authenticated');
  }, []);

  const clearUser = useCallback(() => {
    auth.logout();
    setCurrentUser(null);
    setStatus('anonymous');
  }, []);

  const refresh = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const current = await api.get<AuthUser>('v1/me', { skipAuth: true });
      applyUser(current);
      return current;
    } catch {
      try {
        await api.post<void>('v1/refresh', undefined, { skipAuth: true });
        const current = await api.get<AuthUser>('v1/me', { skipAuth: true });
        applyUser(current);
        return current;
      } catch {
        clearUser();
        return null;
      }
    }
  }, [applyUser, clearUser]);

  useEffect(() => {
    void refresh();
    const expire = () => clearUser();
    const syncCachedUser = () => {
      const cached = auth.getUser();
      setCurrentUser(cached);
      setStatus(cached ? 'authenticated' : 'anonymous');
    };
    window.addEventListener('auth:expired', expire);
    window.addEventListener('auth:changed', syncCachedUser);
    return () => {
      window.removeEventListener('auth:expired', expire);
      window.removeEventListener('auth:changed', syncCachedUser);
    };
  }, [clearUser, refresh]);

  const logout = useCallback(async () => {
    try {
      await api.post<void>('v1/logout');
      clearUser();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearUser();
        return;
      }
      throw error;
    }
  }, [clearUser]);

  const value = useMemo<SessionContextValue>(
    () => ({ status, user, refresh, setUser: applyUser, logout }),
    [applyUser, logout, refresh, status, user],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context)
    throw new Error('useSession must be used inside SessionProvider');
  return context;
}
