import { ICommand } from '@nestjs/cqrs';

export class InitiatePaymentCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly orderId: string,
  ) {}
}
