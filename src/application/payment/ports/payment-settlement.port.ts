import { Payment } from '@/domain/entities/payment';
import { Order } from '@/domain/entities/order';
import { MomoWebhookPayload } from './payment.gateway.port';

export type PaymentSettlementResult = {
  ignored: boolean;
  payment: Payment | null;
  order: Order | null;
  changed: boolean;
};

export interface PaymentSettlementPort {
  settleMomoWebhook(
    payload: MomoWebhookPayload,
  ): Promise<PaymentSettlementResult>;
}
