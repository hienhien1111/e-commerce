import { IEvent } from '@nestjs/cqrs';

export class PaymentKycRejectedEvent implements IEvent {
  constructor(
    public readonly transfiUserId: string,
    public readonly rejectionReason?: string,
    public readonly rejectedAt?: Date,
  ) {}
}
