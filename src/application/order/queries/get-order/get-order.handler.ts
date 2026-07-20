import { ForbiddenException, Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { OrderRepositoryPort } from '@/application/order/ports/order.repository.port';
import { ORDER_REPOSITORY_PORT } from '@/application/order/ports/order.repository.port.token';
import { GetOrderQuery } from './get-order.query';

@QueryHandler(GetOrderQuery)
export class GetOrderHandler implements IQueryHandler<GetOrderQuery> {
  constructor(
    @Inject(ORDER_REPOSITORY_PORT) private readonly orders: OrderRepositoryPort,
  ) {}

  async execute(query: GetOrderQuery) {
    const order = await this.orders.findById(query.orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (!query.isAdmin && order.userId !== query.userId) {
      throw new ForbiddenException('You cannot access this order');
    }
    return order;
  }
}
