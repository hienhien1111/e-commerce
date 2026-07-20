import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { AdminDashboardRepositoryPort } from '@/application/admin/ports/admin-dashboard.repository.port';
import { ADMIN_DASHBOARD_REPOSITORY_PORT } from '@/application/admin/ports/admin-dashboard.repository.port.token';
import { GetAdminDashboardStatsQuery } from './get-admin-dashboard-stats.query';

@QueryHandler(GetAdminDashboardStatsQuery)
export class GetAdminDashboardStatsHandler
  implements IQueryHandler<GetAdminDashboardStatsQuery>
{
  constructor(
    @Inject(ADMIN_DASHBOARD_REPOSITORY_PORT)
    private readonly dashboard: AdminDashboardRepositoryPort,
  ) {}

  execute() {
    return this.dashboard.getDashboardStats();
  }
}
