import { Order } from '@/domain/entities/order';

export interface OrderCancellationPort {
  cancel(input: { orderId: string; allowProcessing: boolean }): Promise<Order>;
}
