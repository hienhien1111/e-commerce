import {
  Body,
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
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/infrastructure/strategies/jwt.strategy';
import { PlaceOrderCommand } from '@/application/order/commands/place-order';
import { CancelOrderCommand } from '@/application/order/commands/cancel-order';
import { GetOrderQuery } from '@/application/order/queries/get-order';
import { GetOrdersQuery } from '@/application/order/queries/get-orders';
import { CreateOrderDto } from '@/presentation/http/dtos/create-order.dto';
import { QueryOrderDto } from '@/presentation/http/dtos/query-order.dto';
import { OrderDto, OrderPageDto } from '@/presentation/http/dtos/order.dto';

@ApiTags('Orders')
@ApiCookieAuth('access_token')
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'orders', version: '1' })
export class OrderController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Post()
  @ApiCreatedResponse({ type: OrderDto })
  place(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateOrderDto) {
    return this.commands.execute(
      new PlaceOrderCommand(user.id, body.shippingAddress),
    );
  }

  @Get()
  @ApiOkResponse({ type: OrderPageDto })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryOrderDto,
  ) {
    return this.queries.execute(
      new GetOrdersQuery(user.id, {
        status: query.status,
        cursor: query.cursor ?? null,
        limit: query.limit ?? 20,
      }),
    );
  }

  @Get(':id')
  @ApiOkResponse({ type: OrderDto })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.queries.execute(new GetOrderQuery(id, user.id));
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: OrderDto })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.commands.execute(new CancelOrderCommand(id, user.id));
  }
}
