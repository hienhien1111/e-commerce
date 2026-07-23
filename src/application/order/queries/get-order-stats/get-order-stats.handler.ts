import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { OrderRepositoryPort } from '@/application/order/ports/order.repository.port';
import { ORDER_REPOSITORY_PORT } from '@/application/order/ports/order.repository.port.token';
import { GetOrderStatsQuery } from './get-order-stats.query';
@QueryHandler(GetOrderStatsQuery)
export class GetOrderStatsHandler implements IQueryHandler<GetOrderStatsQuery> {
  constructor(
    @Inject(ORDER_REPOSITORY_PORT) private readonly orders: OrderRepositoryPort,
  ) {}
  execute(query: GetOrderStatsQuery) {
    return this.orders.getStats(query);
  }
}
