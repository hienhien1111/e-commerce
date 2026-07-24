import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/infrastructure/strategies/jwt.strategy';
import { CheckPermissions } from '@/infrastructure/decorators/check-permissions.decorator';
import { PermissionsGuard } from '@/infrastructure/guards/permissions.guard';
import { PermissionActionEnum } from '@/domain/enums/permission-action.enum';
import { PermissionSubjectEnum } from '@/domain/enums/permission-subject.enum';
import { GetAdminOrderQuery } from '@/application/order/queries/get-admin-order';
import { GetAdminOrdersQuery } from '@/application/order/queries/get-admin-orders';
import { GetOrderStatsQuery } from '@/application/order/queries/get-order-stats';
import { CancelOrderCommand } from '@/application/order/commands/cancel-order';
import { UpdateOrderStatusCommand } from '@/application/order/commands/update-order-status';
import {
  QueryAdminOrderDto,
  QueryOrderStatsDto,
} from '@/presentation/http/dtos/query-order.dto';
import { UpdateOrderStatusDto } from '@/presentation/http/dtos/update-order-status.dto';
import {
  OrderDto,
  OrderPageDto,
  OrderStatsDto,
} from '@/presentation/http/dtos/order.dto';
import { ErrorResponseDto } from '@/presentation/http/dtos/error-response.dto';

@ApiTags('Admin Orders')
@ApiCookieAuth('access_token')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller({ path: 'admin/orders', version: '1' })
export class AdminOrderController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Search and filter orders',
    description:
      'Search supports exact order UUID, customer email/name and shipping phone. Legacy userId remains supported.',
  })
  @CheckPermissions({
    action: PermissionActionEnum.READ,
    subject: PermissionSubjectEnum.ORDER,
  })
  @ApiOkResponse({ type: OrderPageDto })
  findAll(@Query() query: QueryAdminOrderDto) {
    return this.queries.execute(
      new GetAdminOrdersQuery({
        status: query.status,
        userId: query.userId,
        search: query.search?.trim() || undefined,
        paymentMethod: query.paymentMethod,
        paymentStatus: query.paymentStatus,
        reservationStatus: query.reservationStatus,
        from: query.from,
        to: query.to,
        cursor: query.cursor ?? null,
        limit: query.limit ?? 20,
      }),
    );
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get paid revenue and fulfillment counts',
    description:
      'Revenue is filtered by paidAt and includes only PAID orders; order counts are filtered by createdAt.',
  })
  @CheckPermissions({
    action: PermissionActionEnum.READ,
    subject: PermissionSubjectEnum.ORDER,
  })
  @ApiOkResponse({ type: OrderStatsDto })
  stats(@Query() query: QueryOrderStatsDto) {
    return this.queries.execute(new GetOrderStatsQuery(query.from, query.to));
  }

  @Get(':id')
  @CheckPermissions({
    action: PermissionActionEnum.READ,
    subject: PermissionSubjectEnum.ORDER,
  })
  @ApiOkResponse({ type: OrderDto })
  findOne(@Param('id') id: string) {
    return this.queries.execute(new GetAdminOrderQuery(id));
  }

  @Patch(':id/status')
  @CheckPermissions({
    action: PermissionActionEnum.UPDATE,
    subject: PermissionSubjectEnum.ORDER,
  })
  @ApiOkResponse({ type: OrderDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  updateStatus(@Param('id') id: string, @Body() body: UpdateOrderStatusDto) {
    return this.commands.execute(new UpdateOrderStatusCommand(id, body.status));
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @CheckPermissions({
    action: PermissionActionEnum.UPDATE,
    subject: PermissionSubjectEnum.ORDER,
  })
  @ApiOkResponse({ type: OrderDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.commands.execute(new CancelOrderCommand(id, user.id, true));
  }
}
