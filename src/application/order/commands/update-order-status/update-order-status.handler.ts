import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { OrderRepositoryPort } from '@/application/order/ports/order.repository.port';
import { ORDER_REPOSITORY_PORT } from '@/application/order/ports/order.repository.port.token';
import { UpdateOrderStatusCommand } from './update-order-status.command';
import { ApplicationError } from '@/application/shared/errors/application.error';

@CommandHandler(UpdateOrderStatusCommand)
export class UpdateOrderStatusHandler
  implements ICommandHandler<UpdateOrderStatusCommand>
{
  constructor(
    @Inject(ORDER_REPOSITORY_PORT) private readonly orders: OrderRepositoryPort,
  ) {}

  async execute(command: UpdateOrderStatusCommand) {
    const order = await this.orders.findById(command.orderId);
    if (!order) {
      throw new ApplicationError(
        'ORDER_NOT_FOUND',
        'Order not found',
        'NOT_FOUND',
      );
    }
    if (command.status === 'CANCELLED') {
      throw new ApplicationError(
        'ORDER_CANCEL_ENDPOINT_REQUIRED',
        'Use the cancellation endpoint to cancel an order',
        'UNPROCESSABLE',
      );
    }
    try {
      order.transitionTo(command.status);
    } catch {
      throw new ApplicationError(
        'ORDER_TRANSITION_INVALID',
        'Invalid order status transition',
        'UNPROCESSABLE',
      );
    }
    return this.orders.save(order);
  }
}
