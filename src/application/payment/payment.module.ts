import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { OrderModule } from '@/application/order/order.module';
import { PrismaModule } from '@/infrastructure/persistence/prisma/prisma.module';
import { PrismaPaymentRepository } from '@/infrastructure/persistence/repositories/prisma-payment.repository';
import { MomoPaymentGateway } from '@/infrastructure/providers/momo-payment.gateway';
import { PAYMENT_REPOSITORY_PORT } from '@/application/payment/ports/payment.repository.port.token';
import { PAYMENT_GATEWAY_PORT } from '@/application/payment/ports/payment.gateway.port.token';
import { InitiatePaymentHandler } from '@/application/payment/commands/initiate-payment';
import { GetPaymentForOrderHandler } from '@/application/payment/queries/get-payment-for-order';
import { PaymentController } from '@/presentation/http/controllers/payment.controller';

@Module({
  imports: [CqrsModule, PrismaModule, OrderModule],
  controllers: [PaymentController],
  providers: [
    PrismaPaymentRepository,
    MomoPaymentGateway,
    InitiatePaymentHandler,
    GetPaymentForOrderHandler,
    { provide: PAYMENT_REPOSITORY_PORT, useExisting: PrismaPaymentRepository },
    { provide: PAYMENT_GATEWAY_PORT, useExisting: MomoPaymentGateway },
  ],
  exports: [PAYMENT_GATEWAY_PORT],
})
export class PaymentModule {}
