import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@/infrastructure/persistence/prisma/prisma.module';
import { PrismaOrderRepository } from '@/infrastructure/persistence/repositories/prisma-order.repository';
import { ORDER_REPOSITORY_PORT } from '@/application/order/ports/order.repository.port.token';
import { ORDER_CHECKOUT_PORT } from '@/application/order/ports/order-checkout.port.token';
import { ORDER_CANCELLATION_PORT } from '@/application/order/ports/order-cancellation.port.token';
import { PlaceOrderHandler } from '@/application/order/commands/place-order';
import { CancelOrderHandler } from '@/application/order/commands/cancel-order';
import { UpdateOrderStatusHandler } from '@/application/order/commands/update-order-status';
import { GetOrderHandler } from '@/application/order/queries/get-order';
import { GetOrdersHandler } from '@/application/order/queries/get-orders';
import { GetAdminOrderHandler } from '@/application/order/queries/get-admin-order';
import { GetAdminOrdersHandler } from '@/application/order/queries/get-admin-orders';
import { GetOrderStatsHandler } from '@/application/order/queries/get-order-stats';
import { OrderController } from '@/presentation/http/controllers/order.controller';
import { AdminOrderController } from '@/presentation/http/controllers/admin-order.controller';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [OrderController, AdminOrderController],
  providers: [
    PrismaOrderRepository,
    PlaceOrderHandler,
    CancelOrderHandler,
    UpdateOrderStatusHandler,
    GetOrderHandler,
    GetOrdersHandler,
    GetAdminOrderHandler,
    GetAdminOrdersHandler,
    GetOrderStatsHandler,
    { provide: ORDER_REPOSITORY_PORT, useExisting: PrismaOrderRepository },
    { provide: ORDER_CHECKOUT_PORT, useExisting: PrismaOrderRepository },
    { provide: ORDER_CANCELLATION_PORT, useExisting: PrismaOrderRepository },
  ],
})
export class OrderModule {}
