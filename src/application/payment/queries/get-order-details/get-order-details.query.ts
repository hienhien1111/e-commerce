import { IQuery } from '@nestjs/cqrs';

export class GetOrderDetailsQuery implements IQuery {
  constructor(public readonly orderId: string) {}
}
