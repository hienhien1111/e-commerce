import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@/infrastructure/persistence/prisma/prisma.module';
import { PrismaAdminDashboardRepository } from '@/infrastructure/persistence/repositories/prisma-admin-dashboard.repository';
import { ADMIN_DASHBOARD_REPOSITORY_PORT } from '@/application/admin/ports/admin-dashboard.repository.port.token';
import { GetAdminDashboardStatsHandler } from '@/application/admin/queries/get-admin-dashboard-stats';
import { AdminDashboardController } from '@/presentation/http/controllers/admin-dashboard.controller';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [AdminDashboardController],
  providers: [
    PrismaAdminDashboardRepository,
    GetAdminDashboardStatsHandler,
    {
      provide: ADMIN_DASHBOARD_REPOSITORY_PORT,
      useExisting: PrismaAdminDashboardRepository,
    },
  ],
})
export class AdminModule {}
