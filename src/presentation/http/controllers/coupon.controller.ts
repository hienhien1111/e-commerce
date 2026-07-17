import {
  Body,
  Controller,
  Get,
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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateCouponCommand } from '@/application/discount/commands/create-coupon';
import { UpdateCouponCommand } from '@/application/discount/commands/update-coupon';
import { DeactivateCouponCommand } from '@/application/discount/commands/deactivate-coupon';
import { GetCouponsQuery } from '@/application/discount/queries/get-coupons';
import { ValidateCouponQuery } from '@/application/discount/queries/validate-coupon';
import { CheckPermissions } from '@/infrastructure/decorators/check-permissions.decorator';
import { PermissionsGuard } from '@/infrastructure/guards/permissions.guard';
import { PermissionActionEnum } from '@/domain/enums/permission-action.enum';
import { PermissionSubjectEnum } from '@/domain/enums/permission-subject.enum';
import { CouponDto } from '@/presentation/http/dtos/coupon.dto';
import { CreateCouponDto } from '@/presentation/http/dtos/create-coupon.dto';
import { UpdateCouponDto } from '@/presentation/http/dtos/update-coupon.dto';
import { QueryCouponValidationDto } from '@/presentation/http/dtos/query-coupon-validation.dto';
import { CouponValidationDto } from '@/presentation/http/dtos/coupon-validation.dto';

@ApiTags('Coupons')
@Controller({ path: 'coupons', version: '1' })
export class CouponController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('validate')
  @ApiOkResponse({ type: CouponValidationDto })
  validate(@Query() query: QueryCouponValidationDto) {
    return this.queryBus.execute(
      new ValidateCouponQuery(query.code, query.total),
    );
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @CheckPermissions({
    action: PermissionActionEnum.READ,
    subject: PermissionSubjectEnum.COUPON,
  })
  @ApiCookieAuth('access_token')
  @ApiOkResponse({ type: CouponDto, isArray: true })
  findAll() {
    return this.queryBus.execute(new GetCouponsQuery());
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @CheckPermissions({
    action: PermissionActionEnum.CREATE,
    subject: PermissionSubjectEnum.COUPON,
  })
  @ApiCookieAuth('access_token')
  @ApiCreatedResponse({ type: CouponDto })
  create(@Body() body: CreateCouponDto) {
    return this.commandBus.execute(new CreateCouponCommand(body));
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @CheckPermissions({
    action: PermissionActionEnum.UPDATE,
    subject: PermissionSubjectEnum.COUPON,
  })
  @ApiCookieAuth('access_token')
  @ApiOkResponse({ type: CouponDto })
  update(@Param('id') id: string, @Body() body: UpdateCouponDto) {
    return this.commandBus.execute(new UpdateCouponCommand(id, body));
  }

  @Patch(':id/deactivate')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @CheckPermissions({
    action: PermissionActionEnum.UPDATE,
    subject: PermissionSubjectEnum.COUPON,
  })
  @ApiCookieAuth('access_token')
  @ApiOkResponse({ type: CouponDto })
  deactivate(@Param('id') id: string) {
    return this.commandBus.execute(new DeactivateCouponCommand(id));
  }
}
