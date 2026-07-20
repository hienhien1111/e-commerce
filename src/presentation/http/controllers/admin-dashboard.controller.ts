import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { AuthGuard } from '@nestjs/passport';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetAdminDashboardStatsQuery } from '@/application/admin/queries/get-admin-dashboard-stats';
import { PermissionActionEnum } from '@/domain/enums/permission-action.enum';
import { PermissionSubjectEnum } from '@/domain/enums/permission-subject.enum';
import { CheckPermissions } from '@/infrastructure/decorators/check-permissions.decorator';
import { PermissionsGuard } from '@/infrastructure/guards/permissions.guard';
import { AdminDashboardDto } from '@/presentation/http/dtos/admin-dashboard.dto';

@ApiTags('Admin Dashboard')
@ApiCookieAuth('access_token')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller({ path: 'admin', version: '1' })
export class AdminDashboardController {
  constructor(private readonly queries: QueryBus) {}

  @Get('stats')
  @CheckPermissions({
    action: PermissionActionEnum.READ,
    subject: PermissionSubjectEnum.ORDER,
  })
  @ApiOkResponse({ type: AdminDashboardDto })
  stats() {
    return this.queries.execute(new GetAdminDashboardStatsQuery());
  }
}
