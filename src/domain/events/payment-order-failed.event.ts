import { IEvent } from '@nestjs/cqrs';

export class PaymentOrderFailedEvent implements IEvent {
  constructor(
    public readonly orderId: string,
    public readonly failureReason?: string,
  ) {}
}
