import { ForbiddenException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import type { OrderRepositoryPort } from '@/application/order/ports/order.repository.port';
import { ORDER_REPOSITORY_PORT } from '@/application/order/ports/order.repository.port.token';
import type { OrderCancellationPort } from '@/application/order/ports/order-cancellation.port';
import { ORDER_CANCELLATION_PORT } from '@/application/order/ports/order-cancellation.port.token';
import { OrderCancelledEvent } from '@/domain/events/order-cancelled.event';
import { CancelOrderCommand } from './cancel-order.command';

@CommandHandler(CancelOrderCommand)
export class CancelOrderHandler implements ICommandHandler<CancelOrderCommand> {
  constructor(
    @Inject(ORDER_REPOSITORY_PORT) private readonly orders: OrderRepositoryPort,
    @Inject(ORDER_CANCELLATION_PORT)
    private readonly cancellation: OrderCancellationPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CancelOrderCommand) {
    const existing = await this.orders.findById(command.orderId);
    if (!existing) throw new NotFoundException('Order not found');
    if (!command.isAdmin && existing.userId !== command.userId) {
      throw new ForbiddenException('You cannot cancel this order');
    }
    const cancelled = await this.cancellation.cancel({
      orderId: command.orderId,
      allowProcessing: command.isAdmin,
    });
    await this.eventBus.publish(new OrderCancelledEvent(cancelled));
    return cancelled;
  }
}
