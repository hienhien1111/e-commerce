import { OrderItem, OrderItemProps } from '@/domain/entities/order-item';
import { generateUuidV7 } from '@/utils/uuid-v7';

export class OrderItemFactory {
  static create(input: OrderItemProps & { id?: string }): OrderItem {
    return OrderItem._create(input, input.id ?? generateUuidV7());
  }
}
