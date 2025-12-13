import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { PaymentOrderCompletedEvent } from '@/domain/events/payment-order-completed.event';
import type { PaymentOrderRepositoryPort } from '../ports/transfi-order-repository.port';
import { TRANSFI_ORDER_REPOSITORY_PORT } from '../ports/transfi-order-repository.port';
import { OrderStatus } from '@/domain/value-objects/order-status';

@EventsHandler(PaymentOrderCompletedEvent)
export class PaymentOrderCompletedEventHandler
  implements IEventHandler<PaymentOrderCompletedEvent>
{
  private readonly logger = new Logger(PaymentOrderCompletedEventHandler.name);

  constructor(
    @Inject(TRANSFI_ORDER_REPOSITORY_PORT)
    private readonly orderRepository: PaymentOrderRepositoryPort,
  ) {}

  async handle(event: PaymentOrderCompletedEvent) {
    this.logger.log(
      `Handling PaymentOrderCompletedEvent for order: ${event.orderId}`,
    );

    try {
      // Find order in local database
      const order = await this.orderRepository.findByOrderId(event.orderId);

      if (!order) {
        this.logger.warn(`Order ${event.orderId} not found in local database`);
        return;
      }

      // Update order status
      await this.orderRepository.update(order.id, {
        status: OrderStatus.COMPLETED,
        transactionHash: event.transactionHash,
        destinationAmount: event.destinationAmount,
        completedAt: event.completedAt
          ? new Date(event.completedAt)
          : undefined,
      });

      this.logger.log(`Order ${event.orderId} updated to completed status`);

      // TODO: Additional actions
      // - Send push notification to user
      // - Update user wallet/balance
      // - Trigger any business logic (rewards, referrals, etc.)
    } catch (error) {
      this.logger.error(
        `Error handling PaymentOrderCompletedEvent: ${error}`,
        error.stack,
      );
      throw error;
    }
  }
}
