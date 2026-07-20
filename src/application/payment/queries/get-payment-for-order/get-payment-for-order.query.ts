import { IQuery } from '@nestjs/cqrs';

export class GetPaymentForOrderQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly orderId: string,
  ) {}
}
