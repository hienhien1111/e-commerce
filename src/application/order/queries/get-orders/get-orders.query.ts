import { IQuery } from '@nestjs/cqrs';
import { OrderFilters } from '@/application/order/types/order.types';

export class GetOrdersQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly filters: OrderFilters,
  ) {}
}
