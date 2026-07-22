'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from '@/providers/SessionProvider';

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
  const { status, user } = useSession();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    setAuthorized(false);
    if (status === 'loading') return;
    if (!user) {
      const destination = `${pathname}${window.location.search}`;
      router.replace(`/login?redirect=${encodeURIComponent(destination)}`);
      return;
    }
    if (requireAdmin && user.role?.name !== 'admin') {
      router.replace('/');
      return;
    }
    setAuthorized(true);
  }, [pathname, requireAdmin, router, status, user]);

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
