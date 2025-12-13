import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { TransfiHttpAdapter } from '@/infrastructure/adapters/transfi-http.adapter';
import { TransfiApiAdapter } from '@/infrastructure/adapters/transfi-api.adapter';
import { TypeOrmTransfiUserRepository } from '@/infrastructure/persistence/repositories/transfi-user.repository';
import { TypeOrmTransfiOrderRepository } from '@/infrastructure/persistence/repositories/transfi-order.repository';
import { TransfiUserEntity } from '@/infrastructure/persistence/entities/transfi-user.entity';
import { TransfiOrderEntity } from '@/infrastructure/persistence/entities/transfi-order.entity';

import { CreateIndividualUserHandler } from '@/application/payment/commands/create-individual-user';
import { CreatePayinOrderHandler } from '@/application/payment/commands/create-payin-order';

import { GetCurrenciesHandler } from '@/application/payment/queries/get-currencies';
import { GetOrderDetailsHandler } from '@/application/payment/queries/get-order-details';
import { GetPaymentMethodsHandler } from '@/application/payment/queries/get-payment-methods';
import { GetTokensHandler } from '@/application/payment/queries/get-tokens';
import { GetExchangeRateHandler } from '@/application/payment/queries/get-exchange-rate';

import { PaymentOrderCompletedEventHandler } from '@/application/payment/event-handlers/transfi-order-completed.event-handler';
import { PaymentOrderFailedEventHandler } from '@/application/payment/event-handlers/transfi-order-failed.event-handler';
import { PaymentKycApprovedEventHandler } from '@/application/payment/event-handlers/transfi-kyc-approved.event-handler';
import { PaymentKycRejectedEventHandler } from '@/application/payment/event-handlers/transfi-kyc-rejected.event-handler';

import { TRANSFI_API_PORT } from '@/application/payment/ports/transfi-api.port';
import { TRANSFI_USER_REPOSITORY_PORT } from '@/application/payment/ports/transfi-user-repository.port';
import { TRANSFI_ORDER_REPOSITORY_PORT } from '@/application/payment/ports/transfi-order-repository.port';

const CommandHandlers = [CreateIndividualUserHandler, CreatePayinOrderHandler];

const QueryHandlers = [
  GetCurrenciesHandler,
  GetOrderDetailsHandler,
  GetPaymentMethodsHandler,
  GetTokensHandler,
  GetExchangeRateHandler,
];

const EventHandlers = [
  PaymentOrderCompletedEventHandler,
  PaymentOrderFailedEventHandler,
  PaymentKycApprovedEventHandler,
  PaymentKycRejectedEventHandler,
];

@Module({
  imports: [
    CqrsModule,
    HttpModule,
    TypeOrmModule.forFeature([TransfiUserEntity, TransfiOrderEntity]),
    ConfigModule,
  ],
  controllers: [],
  providers: [
    TransfiHttpAdapter,
    TransfiApiAdapter,
    TypeOrmTransfiUserRepository,
    TypeOrmTransfiOrderRepository,

    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,

    {
      provide: TRANSFI_API_PORT,
      useExisting: TransfiApiAdapter,
    },
    {
      provide: TRANSFI_USER_REPOSITORY_PORT,
      useExisting: TypeOrmTransfiUserRepository,
    },
    {
      provide: TRANSFI_ORDER_REPOSITORY_PORT,
      useExisting: TypeOrmTransfiOrderRepository,
    },
  ],
  exports: [
    TRANSFI_API_PORT,
    TRANSFI_USER_REPOSITORY_PORT,
    TRANSFI_ORDER_REPOSITORY_PORT,
  ],
})
export class PaymentModule {}
