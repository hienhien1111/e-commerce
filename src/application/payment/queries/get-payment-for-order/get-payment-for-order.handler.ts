import { ForbiddenException, Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { OrderRepositoryPort } from '@/application/order/ports/order.repository.port';
import { ORDER_REPOSITORY_PORT } from '@/application/order/ports/order.repository.port.token';
import type { PaymentRepositoryPort } from '@/application/payment/ports/payment.repository.port';
import { PAYMENT_REPOSITORY_PORT } from '@/application/payment/ports/payment.repository.port.token';
import { GetPaymentForOrderQuery } from './get-payment-for-order.query';

@QueryHandler(GetPaymentForOrderQuery)
export class GetPaymentForOrderHandler
  implements IQueryHandler<GetPaymentForOrderQuery>
{
  constructor(
    @Inject(ORDER_REPOSITORY_PORT)
    private readonly orders: OrderRepositoryPort,
    @Inject(PAYMENT_REPOSITORY_PORT)
    private readonly payments: PaymentRepositoryPort,
  ) {}

  async execute(query: GetPaymentForOrderQuery) {
    const order = await this.orders.findById(query.orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== query.userId) {
      throw new ForbiddenException('You cannot access this payment');
    }
    const payment = await this.payments.findByOrderId(query.orderId);
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }
}
