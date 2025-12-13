import { IEvent } from '@nestjs/cqrs';

export class PaymentOrderCompletedEvent implements IEvent {
  constructor(
    public readonly orderId: string,
    public readonly transactionHash?: string,
    public readonly destinationAmount?: number,
    public readonly completedAt?: string,
  ) {}
}
