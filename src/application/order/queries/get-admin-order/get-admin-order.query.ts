import { IQuery } from '@nestjs/cqrs';

export class GetAdminOrderQuery implements IQuery {
  constructor(public readonly orderId: string) {}
}
