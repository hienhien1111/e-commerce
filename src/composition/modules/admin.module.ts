import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@/infrastructure/persistence/prisma/prisma.module';
import { PrismaAdminDashboardRepository } from '@/infrastructure/persistence/repositories/prisma-admin-dashboard.repository';
import { ADMIN_DASHBOARD_REPOSITORY_PORT } from '@/application/admin/ports/admin-dashboard.repository.port.token';
import { GetAdminDashboardStatsHandler } from '@/application/admin/queries/get-admin-dashboard-stats';
import { AdminDashboardController } from '@/presentation/http/controllers/admin-dashboard.controller';
import { AdminCommerceOperationController } from '@/presentation/http/controllers/admin-commerce-operation.controller';
import { PrismaCommerceOperationRepository } from '@/infrastructure/persistence/repositories/prisma-commerce-operation.repository';
import { COMMERCE_OPERATION_REPOSITORY_PORT } from '@/application/admin/ports/commerce-operation.repository.port.token';
import { GetCommerceOperationsHandler } from '@/application/admin/queries/get-commerce-operations';
import { RetryCommerceOperationHandler } from '@/application/admin/commands/retry-commerce-operation';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [AdminDashboardController, AdminCommerceOperationController],
  providers: [
    PrismaAdminDashboardRepository,
    PrismaCommerceOperationRepository,
    GetAdminDashboardStatsHandler,
    GetCommerceOperationsHandler,
    RetryCommerceOperationHandler,
    {
      provide: ADMIN_DASHBOARD_REPOSITORY_PORT,
      useExisting: PrismaAdminDashboardRepository,
    },
    {
      provide: COMMERCE_OPERATION_REPOSITORY_PORT,
      useExisting: PrismaCommerceOperationRepository,
    },
  ],
})
export class AdminModule {}
