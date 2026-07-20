import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { OrderRepositoryPort } from '@/application/order/ports/order.repository.port';
import { ORDER_REPOSITORY_PORT } from '@/application/order/ports/order.repository.port.token';
import { GetAdminOrderQuery } from './get-admin-order.query';

@QueryHandler(GetAdminOrderQuery)
export class GetAdminOrderHandler implements IQueryHandler<GetAdminOrderQuery> {
  constructor(
    @Inject(ORDER_REPOSITORY_PORT) private readonly orders: OrderRepositoryPort,
  ) {}
  async execute(query: GetAdminOrderQuery) {
    const order = await this.orders.findById(query.orderId);
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
}
