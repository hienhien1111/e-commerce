import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { PaymentOrderFailedEvent } from '@/domain/events/payment-order-failed.event';
import type { PaymentOrderRepositoryPort } from '../ports/transfi-order-repository.port';
import { TRANSFI_ORDER_REPOSITORY_PORT } from '../ports/transfi-order-repository.port';
import { OrderStatus } from '@/domain/value-objects/order-status';

@EventsHandler(PaymentOrderFailedEvent)
export class PaymentOrderFailedEventHandler
  implements IEventHandler<PaymentOrderFailedEvent>
{
  private readonly logger = new Logger(PaymentOrderFailedEventHandler.name);

  constructor(
    @Inject(TRANSFI_ORDER_REPOSITORY_PORT)
    private readonly orderRepository: PaymentOrderRepositoryPort,
  ) {}

  async handle(event: PaymentOrderFailedEvent) {
    this.logger.log(
      `Handling PaymentOrderFailedEvent for order: ${event.orderId}`,
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
        status: OrderStatus.FAILED,
        failureReason: event.failureReason,
      });

      this.logger.log(`Order ${event.orderId} updated to failed status`);

      // TODO: Additional actions
      // - Send notification to user about failure
      // - Log for analytics/debugging
      // - Trigger refund process if applicable
    } catch (error) {
      this.logger.error(
        `Error handling PaymentOrderFailedEvent: ${error}`,
        error.stack,
      );
      throw error;
    }
  }
}
