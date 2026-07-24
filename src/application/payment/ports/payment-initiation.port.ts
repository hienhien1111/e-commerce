import { Payment } from '@/domain/entities/payment';

export type MomoInitiationReservation =
  | { state: 'REUSE' | 'IN_PROGRESS'; payment: Payment }
  | {
      state: 'INITIATE';
      payment: Payment;
      providerOrderId: string;
      requestId: string;
    };

export interface PaymentInitiationPort {
  reserveMomoInitiation(input: {
    orderId: string;
    amount: number;
    expiresAt: Date;
    now: Date;
  }): Promise<MomoInitiationReservation>;
  completeMomoInitiation(input: {
    paymentId: string;
    requestId: string;
    session: {
      payUrl: string;
      qrCodeUrl: string | null;
      deeplink: string | null;
    };
  }): Promise<Payment>;
  failMomoInitiation(input: {
    paymentId: string;
    requestId: string;
    message: string;
    resultCode?: number;
  }): Promise<Payment>;
}
