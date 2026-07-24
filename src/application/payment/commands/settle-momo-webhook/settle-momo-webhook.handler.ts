import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { PaymentGatewayPort } from '@/application/payment/ports/payment.gateway.port';
import { PAYMENT_GATEWAY_PORT } from '@/application/payment/ports/payment.gateway.port.token';
import type { PaymentSettlementPort } from '@/application/payment/ports/payment-settlement.port';
import { PAYMENT_SETTLEMENT_PORT } from '@/application/payment/ports/payment-settlement.port.token';
import { ApplicationError } from '@/application/shared/errors/application.error';
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
  ) {}

  async execute(command: SettleMomoWebhookCommand): Promise<void> {
    if (!this.gateway.verifyWebhook(command.payload)) {
      throw new ApplicationError(
        'MOMO_SIGNATURE_INVALID',
        'Invalid MoMo signature',
        'UNAUTHORIZED',
      );
    }
    await this.settlement.settleMomoWebhook(command.payload);
  }
}
