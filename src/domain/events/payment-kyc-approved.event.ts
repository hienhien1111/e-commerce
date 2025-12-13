import { IEvent } from '@nestjs/cqrs';

export class PaymentKycApprovedEvent implements IEvent {
  constructor(
    public readonly transfiUserId: string,
    public readonly kycLevel?: string,
  ) {}
}
