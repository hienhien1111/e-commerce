import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import type { OrderCheckoutPort } from '@/application/order/ports/order-checkout.port';
import { ORDER_CHECKOUT_PORT } from '@/application/order/ports/order-checkout.port.token';
import { OrderPlacedEvent } from '@/domain/events/order-placed.event';
import { PlaceOrderCommand } from './place-order.command';

@CommandHandler(PlaceOrderCommand)
export class PlaceOrderHandler implements ICommandHandler<PlaceOrderCommand> {
  constructor(
    @Inject(ORDER_CHECKOUT_PORT) private readonly checkout: OrderCheckoutPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: PlaceOrderCommand) {
    const order = await this.checkout.checkout(command);
    await this.eventBus.publish(new OrderPlacedEvent(order));
    return order;
  }
}
