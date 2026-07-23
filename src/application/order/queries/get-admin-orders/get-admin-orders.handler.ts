import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { OrderRepositoryPort } from '@/application/order/ports/order.repository.port';
import { ORDER_REPOSITORY_PORT } from '@/application/order/ports/order.repository.port.token';
import { GetAdminOrdersQuery } from './get-admin-orders.query';
@QueryHandler(GetAdminOrdersQuery)
export class GetAdminOrdersHandler
  implements IQueryHandler<GetAdminOrdersQuery>
{
  constructor(
    @Inject(ORDER_REPOSITORY_PORT) private readonly orders: OrderRepositoryPort,
  ) {}
  execute(query: GetAdminOrdersQuery) {
    return this.orders.findAdminPage(query.filters);
  }
}
