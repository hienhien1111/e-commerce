import { ICommand } from '@nestjs/cqrs';
import { MomoWebhookPayload } from '@/application/payment/ports/payment.gateway.port';

export class SettleMomoWebhookCommand implements ICommand {
  constructor(public readonly payload: MomoWebhookPayload) {}
}
