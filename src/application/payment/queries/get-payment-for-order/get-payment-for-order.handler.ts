import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { OrderRepositoryPort } from '@/application/order/ports/order.repository.port';
import { ORDER_REPOSITORY_PORT } from '@/application/order/ports/order.repository.port.token';
import type { PaymentRepositoryPort } from '@/application/payment/ports/payment.repository.port';
import { PAYMENT_REPOSITORY_PORT } from '@/application/payment/ports/payment.repository.port.token';
import { PaymentMethodEnum } from '@/domain/enums/payment-method.enum';
import { GetPaymentForOrderQuery } from './get-payment-for-order.query';
import { ApplicationError } from '@/application/shared/errors/application.error';

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
    if (!order) {
      throw new ApplicationError(
        'ORDER_NOT_FOUND',
        'Order not found',
        'NOT_FOUND',
      );
    }
    if (order.userId !== query.userId) {
      throw new ApplicationError(
        'PAYMENT_FORBIDDEN',
        'You cannot access this payment',
        'FORBIDDEN',
      );
    }
    if (order.paymentMethod !== PaymentMethodEnum.MOMO) {
      throw new ApplicationError(
        'PAYMENT_METHOD_NOT_MOMO',
        'Đơn hàng này được chọn thanh toán khi nhận hàng.',
        'UNPROCESSABLE',
      );
    }
    const payment = await this.payments.findByOrderId(query.orderId);
    if (!payment) {
      throw new ApplicationError(
        'PAYMENT_NOT_FOUND',
        'Payment not found',
        'NOT_FOUND',
      );
    }
    return payment;
  }
}
