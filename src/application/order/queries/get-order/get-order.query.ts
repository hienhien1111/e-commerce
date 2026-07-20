import { IQuery } from '@nestjs/cqrs';

export class GetOrderQuery implements IQuery {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly isAdmin = false,
  ) {}
}
