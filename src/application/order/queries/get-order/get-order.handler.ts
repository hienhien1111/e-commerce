import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { OrderRepositoryPort } from '@/application/order/ports/order.repository.port';
import { ORDER_REPOSITORY_PORT } from '@/application/order/ports/order.repository.port.token';
import { GetOrderQuery } from './get-order.query';
import { ApplicationError } from '@/application/shared/errors/application.error';

@QueryHandler(GetOrderQuery)
export class GetOrderHandler implements IQueryHandler<GetOrderQuery> {
  constructor(
    @Inject(ORDER_REPOSITORY_PORT) private readonly orders: OrderRepositoryPort,
  ) {}

  async execute(query: GetOrderQuery) {
    const order = await this.orders.findById(query.orderId);
    if (!order) {
      throw new ApplicationError(
        'ORDER_NOT_FOUND',
        'Order not found',
        'NOT_FOUND',
      );
    }
    if (!query.isAdmin && order.userId !== query.userId) {
      throw new ApplicationError(
        'ORDER_FORBIDDEN',
        'You cannot access this order',
        'FORBIDDEN',
      );
    }
    return order;
  }
}
