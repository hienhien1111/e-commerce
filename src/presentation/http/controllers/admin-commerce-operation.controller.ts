import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RetryCommerceOperationCommand } from '@/application/admin/commands/retry-commerce-operation';
import { GetCommerceOperationsQuery } from '@/application/admin/queries/get-commerce-operations';
import { PermissionActionEnum } from '@/domain/enums/permission-action.enum';
import { PermissionSubjectEnum } from '@/domain/enums/permission-subject.enum';
import { CheckAnyPermissions } from '@/infrastructure/decorators/check-permissions.decorator';
import { PermissionsGuard } from '@/infrastructure/guards/permissions.guard';
import {
  CommerceOperationDto,
  CommerceOperationPageDto,
  QueryCommerceOperationDto,
} from '@/presentation/http/dtos/commerce-operation.dto';
import { ErrorResponseDto } from '@/presentation/http/dtos/error-response.dto';

@ApiTags('Admin Commerce Operations')
@ApiCookieAuth('access_token')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller({ path: 'admin/operations', version: '1' })
export class AdminCommerceOperationController {
  constructor(
    private readonly queries: QueryBus,
    private readonly commands: CommandBus,
  ) {}

  @Get()
  @CheckAnyPermissions(
    {
      action: PermissionActionEnum.READ,
      subject: PermissionSubjectEnum.ORDER,
    },
    {
      action: PermissionActionEnum.READ,
      subject: PermissionSubjectEnum.PAYMENT,
    },
  )
  @ApiOperation({ summary: 'List outbox/saga operations' })
  @ApiOkResponse({ type: CommerceOperationPageDto })
  findAll(@Query() query: QueryCommerceOperationDto) {
    return this.queries.execute(
      new GetCommerceOperationsQuery(
        query.status,
        query.eventType?.trim() || undefined,
        query.cursor ?? null,
        query.limit ?? 20,
      ),
    );
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  @CheckAnyPermissions(
    {
      action: PermissionActionEnum.UPDATE,
      subject: PermissionSubjectEnum.ORDER,
    },
    {
      action: PermissionActionEnum.UPDATE,
      subject: PermissionSubjectEnum.PAYMENT,
    },
  )
  @ApiOperation({ summary: 'Retry a dead-letter commerce operation' })
  @ApiOkResponse({ type: CommerceOperationDto })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Operation not found',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Operation is not retryable',
  })
  retry(@Param('id') id: string) {
    return this.commands.execute(new RetryCommerceOperationCommand(id));
  }
}
