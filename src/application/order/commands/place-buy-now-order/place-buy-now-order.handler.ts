import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import type { OrderCheckoutPort } from '@/application/order/ports/order-checkout.port';
import { ORDER_CHECKOUT_PORT } from '@/application/order/ports/order-checkout.port.token';
import { OrderPlacedEvent } from '@/domain/events/order-placed.event';
import { PlaceBuyNowOrderCommand } from './place-buy-now-order.command';

@CommandHandler(PlaceBuyNowOrderCommand)
export class PlaceBuyNowOrderHandler
  implements ICommandHandler<PlaceBuyNowOrderCommand>
{
  constructor(
    @Inject(ORDER_CHECKOUT_PORT) private readonly checkout: OrderCheckoutPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: PlaceBuyNowOrderCommand) {
    const order = await this.checkout.checkoutBuyNow(command);
    await this.eventBus.publish(new OrderPlacedEvent(order));
    return order;
  }
}
