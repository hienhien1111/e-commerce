import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiCookieAuth,
  ApiAcceptedResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/infrastructure/strategies/jwt.strategy';
import { PlaceOrderCommand } from '@/application/order/commands/place-order';
import { PlaceBuyNowOrderCommand } from '@/application/order/commands/place-buy-now-order';
import { CancelOrderCommand } from '@/application/order/commands/cancel-order';
import { GetOrderQuery } from '@/application/order/queries/get-order';
import { GetOrdersQuery } from '@/application/order/queries/get-orders';
import {
  CreateBuyNowOrderDto,
  CreateOrderDto,
} from '@/presentation/http/dtos/create-order.dto';
import { QueryOrderDto } from '@/presentation/http/dtos/query-order.dto';
import { OrderDto, OrderPageDto } from '@/presentation/http/dtos/order.dto';
import { Order } from '@/domain/entities/order';
import { ReservationStatusEnum } from '@/domain/enums/reservation-status.enum';
import { ErrorResponseDto } from '@/presentation/http/dtos/error-response.dto';

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
  @ApiOperation({
    summary: 'Checkout current cart',
    description:
      'Creates the order snapshot and outbox atomically, then waits up to five seconds for stock/coupon reservation.',
  })
  @ApiCreatedResponse({ type: OrderDto })
  @ApiAcceptedResponse({
    type: OrderDto,
    description: 'Reservation is still being processed asynchronously.',
  })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description:
      'Cart/coupon is invalid or reservation failed. RESERVATION_FAILED includes orderId.',
  })
  async place(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateOrderDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const order = await this.commands.execute<PlaceOrderCommand, Order>(
      new PlaceOrderCommand(user.id, body.shippingAddress, body.paymentMethod),
    );
    this.applyCheckoutStatus(response, order);
    return order;
  }

  @Post('buy-now')
  @ApiOperation({ summary: 'Checkout one product variant immediately' })
  @ApiCreatedResponse({ type: OrderDto })
  @ApiAcceptedResponse({
    type: OrderDto,
    description: 'Reservation is still being processed asynchronously.',
  })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  async buyNow(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateBuyNowOrderDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const order = await this.commands.execute<PlaceBuyNowOrderCommand, Order>(
      new PlaceBuyNowOrderCommand(
        user.id,
        body.productId,
        body.variantId,
        body.quantity,
        body.couponCode,
        body.shippingAddress,
        body.paymentMethod,
      ),
    );
    this.applyCheckoutStatus(response, order);
    return order;
  }

  @Get()
  @ApiOperation({ summary: 'List current customer orders' })
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
  @ApiOperation({ summary: 'Get current customer order for polling/detail' })
  @ApiOkResponse({ type: OrderDto })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.queries.execute(new GetOrderQuery(id, user.id));
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: OrderDto })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description: 'Order state or payment state does not allow cancellation.',
  })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.commands.execute(new CancelOrderCommand(id, user.id));
  }

  private applyCheckoutStatus(response: Response, order: Order): void {
    if (order.reservationStatus === ReservationStatusEnum.PENDING) {
      response.status(HttpStatus.ACCEPTED);
    }
  }
}
