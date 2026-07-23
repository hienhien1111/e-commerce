import { Order } from '@/domain/entities/order';
import { BaseDomainEvent } from '@/shared/domain/domain-event';

export class OrderCancelledEvent extends BaseDomainEvent {
  constructor(public readonly order: Order) {
    super();
  }
}
