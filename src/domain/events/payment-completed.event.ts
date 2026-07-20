import { Payment } from '@/domain/entities/payment';
import { BaseDomainEvent } from '@/shared/domain/domain-event';

export class PaymentCompletedEvent extends BaseDomainEvent {
  constructor(public readonly payment: Payment) {
    super();
  }
}
