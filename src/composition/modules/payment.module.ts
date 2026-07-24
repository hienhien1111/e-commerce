import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { OrderModule } from '@/composition/modules/order.module';
import { PrismaModule } from '@/infrastructure/persistence/prisma/prisma.module';
import { PrismaPaymentRepository } from '@/infrastructure/persistence/repositories/prisma-payment.repository';
import { MomoPaymentGateway } from '@/infrastructure/providers/momo-payment.gateway';
import { PAYMENT_REPOSITORY_PORT } from '@/application/payment/ports/payment.repository.port.token';
import { PAYMENT_GATEWAY_PORT } from '@/application/payment/ports/payment.gateway.port.token';
import { PAYMENT_SETTLEMENT_PORT } from '@/application/payment/ports/payment-settlement.port.token';
import { InitiatePaymentHandler } from '@/application/payment/commands/initiate-payment';
import { SettleMomoWebhookHandler } from '@/application/payment/commands/settle-momo-webhook';
import { GetPaymentForOrderHandler } from '@/application/payment/queries/get-payment-for-order';
import { PaymentController } from '@/presentation/http/controllers/payment.controller';
import { MomoWebhookController } from '@/presentation/http/controllers/momo-webhook.controller';
import { CommerceQueueService } from '@/infrastructure/messaging/commerce-queue.service';
import { PrismaOutboxRepository } from '@/infrastructure/messaging/prisma-outbox.repository';
import { PrismaCommerceSagaRepository } from '@/infrastructure/persistence/repositories/prisma-commerce-saga.repository';
import { PrismaPaymentRefundRepository } from '@/infrastructure/persistence/repositories/prisma-payment-refund.repository';

@Module({
  imports: [CqrsModule, PrismaModule, OrderModule],
  controllers: [PaymentController, MomoWebhookController],
  providers: [
    PrismaPaymentRepository,
    MomoPaymentGateway,
    PrismaOutboxRepository,
    PrismaCommerceSagaRepository,
    PrismaPaymentRefundRepository,
    CommerceQueueService,
    InitiatePaymentHandler,
    SettleMomoWebhookHandler,
    GetPaymentForOrderHandler,
    { provide: PAYMENT_REPOSITORY_PORT, useExisting: PrismaPaymentRepository },
    { provide: PAYMENT_SETTLEMENT_PORT, useExisting: PrismaPaymentRepository },
    { provide: PAYMENT_GATEWAY_PORT, useExisting: MomoPaymentGateway },
  ],
  exports: [PAYMENT_GATEWAY_PORT],
})
export class PaymentModule {}
