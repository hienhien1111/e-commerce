import {
  Inject,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { OrderRepositoryPort } from '@/application/order/ports/order.repository.port';
import { ORDER_REPOSITORY_PORT } from '@/application/order/ports/order.repository.port.token';
import { UpdateOrderStatusCommand } from './update-order-status.command';

@CommandHandler(UpdateOrderStatusCommand)
export class UpdateOrderStatusHandler
  implements ICommandHandler<UpdateOrderStatusCommand>
{
  constructor(
    @Inject(ORDER_REPOSITORY_PORT) private readonly orders: OrderRepositoryPort,
  ) {}

  async execute(command: UpdateOrderStatusCommand) {
    const order = await this.orders.findById(command.orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (command.status === 'CANCELLED') {
      throw new UnprocessableEntityException(
        'Use the cancellation endpoint to cancel an order',
      );
    }
    try {
      order.transitionTo(command.status);
    } catch {
      throw new UnprocessableEntityException('Invalid order status transition');
    }
    return this.orders.save(order);
  }
}
