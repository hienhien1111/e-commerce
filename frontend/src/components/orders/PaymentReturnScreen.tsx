'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { decodePaymentReturnOrderId } from '@/lib/payment';

function PaymentReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const orderId = decodePaymentReturnOrderId(searchParams.get('extraData'));
    router.replace(orderId ? `/orders/${orderId}/payment` : '/orders');
  }, [router, searchParams]);

  return (
    <main className="container" style={{ paddingTop: 80, textAlign: 'center' }}>
      Đang quay lại trang thanh toán…
    </main>
  );
}

export function PaymentReturnScreen() {
  return (
    <Suspense
      fallback={<main className="container">Đang quay lại thanh toán…</main>}
    >
      <AuthGuard>
        <PaymentReturnContent />
      </AuthGuard>
    </Suspense>
  );
}
