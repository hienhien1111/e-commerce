import { Inject, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import type { PaymentGatewayPort } from '@/application/payment/ports/payment.gateway.port';
import { PAYMENT_GATEWAY_PORT } from '@/application/payment/ports/payment.gateway.port.token';
import type { PaymentSettlementPort } from '@/application/payment/ports/payment-settlement.port';
import { PAYMENT_SETTLEMENT_PORT } from '@/application/payment/ports/payment-settlement.port.token';
import { PaymentStatusEnum } from '@/domain/enums/payment-status.enum';
import { PaymentCompletedEvent } from '@/domain/events/payment-completed.event';
import { PaymentFailedEvent } from '@/domain/events/payment-failed.event';
import { SettleMomoWebhookCommand } from './settle-momo-webhook.command';

@CommandHandler(SettleMomoWebhookCommand)
export class SettleMomoWebhookHandler
  implements ICommandHandler<SettleMomoWebhookCommand>
{
  constructor(
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly gateway: PaymentGatewayPort,
    @Inject(PAYMENT_SETTLEMENT_PORT)
    private readonly settlement: PaymentSettlementPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: SettleMomoWebhookCommand): Promise<void> {
    if (!this.gateway.verifyWebhook(command.payload)) {
      throw new UnauthorizedException('Invalid MoMo signature');
    }
    const settled = await this.settlement.settleMomoWebhook(command.payload);
    if (!settled.changed || !settled.payment) return;
    if (settled.payment.status === PaymentStatusEnum.PAID) {
      await this.eventBus.publish(new PaymentCompletedEvent(settled.payment));
    } else if (settled.payment.status === PaymentStatusEnum.FAILED) {
      await this.eventBus.publish(new PaymentFailedEvent(settled.payment));
    }
  }
}
