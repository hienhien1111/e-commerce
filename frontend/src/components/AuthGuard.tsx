'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth, type AuthUser } from '@/lib/auth';
import { api } from '@/lib/api';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function AuthGuard({
  children,
  requireAdmin = false,
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;

    const verifySession = async () => {
      try {
        const user = await api.get<AuthUser>('v1/me');
        if (!active) return;

        auth.setUser(user);
        if (requireAdmin && !auth.isAdmin()) {
          router.replace('/');
          return;
        }

        setAuthorized(true);
      } catch {
        if (!active) return;

        auth.logout();
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
    };

    void verifySession();

    return () => {
      active = false;
    };
  }, [router, pathname, requireAdmin]);

  if (!authorized) {
    return (
      <div
        className="container"
        style={{ paddingTop: '80px', textAlign: 'center' }}
      >
        <div
          className="skeleton"
          style={{
            height: '400px',
            width: '100%',
            maxWidth: '600px',
            margin: '0 auto',
          }}
        />
      </div>
    );
  }

  return <>{children}</>;
}
