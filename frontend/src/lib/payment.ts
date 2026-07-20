import type { PaymentStatus } from './order';

export type Payment = {
  id: string;
  orderId: string;
  provider: string;
  amount: number;
  status: PaymentStatus;
  payUrl: string | null;
  qrCodeUrl: string | null;
  deeplink: string | null;
  expiresAt: string | null;
  paidAt: string | null;
};

export function decodePaymentReturnOrderId(extraData: string | null): string | null {
  if (!extraData) return null;
  try {
    const parsed = JSON.parse(atob(extraData)) as { orderId?: unknown };
    const orderId = typeof parsed.orderId === 'string' ? parsed.orderId : null;
    return orderId && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(orderId)
      ? orderId
      : null;
  } catch {
    return null;
  }
}
