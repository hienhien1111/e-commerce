import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { OrderRepositoryPort } from '@/application/order/ports/order.repository.port';
import { ORDER_REPOSITORY_PORT } from '@/application/order/ports/order.repository.port.token';
import { GetOrdersQuery } from './get-orders.query';

@QueryHandler(GetOrdersQuery)
export class GetOrdersHandler implements IQueryHandler<GetOrdersQuery> {
  constructor(
    @Inject(ORDER_REPOSITORY_PORT) private readonly orders: OrderRepositoryPort,
  ) {}
  execute(query: GetOrdersQuery) {
    return this.orders.findPageForUser(query.userId, query.filters);
  }
}
