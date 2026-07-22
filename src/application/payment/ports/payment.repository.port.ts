import { Payment } from '@/domain/entities/payment';
import { NullableType } from '@/utils/types/nullable.type';

export type MomoInitiationReservation =
  | { state: 'REUSE' | 'IN_PROGRESS'; payment: Payment }
  | {
      state: 'INITIATE';
      payment: Payment;
      providerOrderId: string;
      requestId: string;
    };

export interface PaymentRepositoryPort {
  findByOrderId(orderId: string): Promise<NullableType<Payment>>;
  create(payment: Payment): Promise<Payment>;
  save(payment: Payment): Promise<Payment>;
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
