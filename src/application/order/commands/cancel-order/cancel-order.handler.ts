import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { OrderRepositoryPort } from '@/application/order/ports/order.repository.port';
import { ORDER_REPOSITORY_PORT } from '@/application/order/ports/order.repository.port.token';
import type { OrderCancellationPort } from '@/application/order/ports/order-cancellation.port';
import { ORDER_CANCELLATION_PORT } from '@/application/order/ports/order-cancellation.port.token';
import { ApplicationError } from '@/application/shared/errors/application.error';
import { CancelOrderCommand } from './cancel-order.command';

@CommandHandler(CancelOrderCommand)
export class CancelOrderHandler implements ICommandHandler<CancelOrderCommand> {
  constructor(
    @Inject(ORDER_REPOSITORY_PORT) private readonly orders: OrderRepositoryPort,
    @Inject(ORDER_CANCELLATION_PORT)
    private readonly cancellation: OrderCancellationPort,
  ) {}

  async execute(command: CancelOrderCommand) {
    const existing = await this.orders.findById(command.orderId);
    if (!existing) {
      throw new ApplicationError(
        'ORDER_NOT_FOUND',
        'Order not found',
        'NOT_FOUND',
      );
    }
    if (!command.isAdmin && existing.userId !== command.userId) {
      throw new ApplicationError(
        'ORDER_FORBIDDEN',
        'You cannot cancel this order',
        'FORBIDDEN',
      );
    }
    return this.cancellation.cancel({
      orderId: command.orderId,
      allowProcessing: command.isAdmin,
    });
  }
}
