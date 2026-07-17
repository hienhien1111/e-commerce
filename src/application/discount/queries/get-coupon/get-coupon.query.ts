import { IQuery } from '@nestjs/cqrs';

export class GetCouponQuery implements IQuery {
  constructor(public readonly id: string) {}
}
