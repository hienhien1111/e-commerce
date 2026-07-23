import { IQuery } from '@nestjs/cqrs';
export class GetOrderStatsQuery implements IQuery {
  constructor(
    public readonly from?: Date,
    public readonly to?: Date,
  ) {}
}
