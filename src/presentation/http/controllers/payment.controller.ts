import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/infrastructure/strategies/jwt.strategy';
import { InitiatePaymentCommand } from '@/application/payment/commands/initiate-payment';
import { GetPaymentForOrderQuery } from '@/application/payment/queries/get-payment-for-order';
import { InitiatePaymentDto } from '@/presentation/http/dtos/initiate-payment.dto';
import { PaymentDto } from '@/presentation/http/dtos/payment.dto';
import { ErrorResponseDto } from '@/presentation/http/dtos/error-response.dto';

@ApiTags('Payments')
@ApiCookieAuth('access_token')
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'payments', version: '1' })
export class PaymentController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Post('initiate')
  @ApiOperation({
    summary: 'Create or reuse a MoMo payment session',
    description:
      'Only RESERVED MoMo orders are accepted. The payment expiry never exceeds the inventory reservation expiry.',
  })
  @ApiCreatedResponse({ type: PaymentDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto })
  async initiate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: InitiatePaymentDto,
  ): Promise<PaymentDto> {
    const payment = await this.commands.execute(
      new InitiatePaymentCommand(user.id, body.orderId),
    );
    return PaymentDto.from(payment);
  }

  @Get('order/:orderId')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: PaymentDto })
  @ApiOperation({ summary: 'Get MoMo payment state for an order' })
  async getByOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ): Promise<PaymentDto> {
    const payment = await this.queries.execute(
      new GetPaymentForOrderQuery(user.id, orderId),
    );
    return PaymentDto.from(payment);
  }
}
