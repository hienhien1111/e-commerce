import {
  PaymentOrder,
  PaymentOrderEssentialProps,
} from '@/domain/entities/payment-order';

export interface PaymentOrderRepositoryPort {
  findById(id: string): Promise<PaymentOrder | null>;
  findByOrderId(orderId: string): Promise<PaymentOrder | null>;
  findByExternalOrderId(externalOrderId: string): Promise<PaymentOrder | null>;
  findByPaymentUserId(transfiUserId: string): Promise<PaymentOrder[]>;
  create(order: Partial<PaymentOrderEssentialProps>): Promise<PaymentOrder>;
  update(id: string, order: Partial<PaymentOrderEssentialProps>): Promise<void>;
  findAll?(page?: number, limit?: number): Promise<[PaymentOrder[], number]>;
}

export const TRANSFI_ORDER_REPOSITORY_PORT = Symbol(
  'TRANSFI_ORDER_REPOSITORY_PORT',
);
