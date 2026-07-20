import { Payment } from '@/domain/entities/payment';
import { NullableType } from '@/utils/types/nullable.type';

export interface PaymentRepositoryPort {
  findByOrderId(orderId: string): Promise<NullableType<Payment>>;
  create(payment: Payment): Promise<Payment>;
  save(payment: Payment): Promise<Payment>;
}
