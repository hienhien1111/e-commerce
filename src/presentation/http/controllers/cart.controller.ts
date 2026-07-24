import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/infrastructure/strategies/jwt.strategy';
import { AddToCartCommand } from '@/application/cart/commands/add-to-cart';
import { UpdateCartItemCommand } from '@/application/cart/commands/update-cart-item';
import { RemoveFromCartCommand } from '@/application/cart/commands/remove-from-cart';
import { ClearCartCommand } from '@/application/cart/commands/clear-cart';
import { ApplyCartCouponCommand } from '@/application/cart/commands/apply-cart-coupon';
import { RemoveCartCouponCommand } from '@/application/cart/commands/remove-cart-coupon';
import { GetCartQuery } from '@/application/cart/queries/get-cart';
import { AddCartItemDto } from '@/presentation/http/dtos/add-cart-item.dto';
import { UpdateCartItemDto } from '@/presentation/http/dtos/update-cart-item.dto';
import { ApplyCartCouponDto } from '@/presentation/http/dtos/apply-cart-coupon.dto';
import { CartDto } from '@/presentation/http/dtos/cart.dto';
import { ErrorResponseDto } from '@/presentation/http/dtos/error-response.dto';

@ApiTags('Cart')
@ApiCookieAuth('access_token')
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'cart', version: '1' })
export class CartController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOkResponse({ type: CartDto })
  find(@CurrentUser() user: AuthenticatedUser) {
    return this.queryBus.execute(new GetCartQuery(user.id));
  }

  @Post('items')
  @ApiOperation({
    summary: 'Add a variant to cart',
    description:
      'Cart uniqueness is based on variantId, so variants of the same product remain separate lines.',
  })
  @ApiCreatedResponse({ type: CartDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: AddCartItemDto,
  ) {
    return this.commandBus.execute(
      new AddToCartCommand(
        user.id,
        body.productId ?? null,
        body.variantId ?? null,
        body.quantity,
      ),
    );
  }

  @Patch('items/:variantId')
  @ApiOkResponse({ type: CartDto })
  updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('variantId') variantId: string,
    @Body() body: UpdateCartItemDto,
  ) {
    return this.commandBus.execute(
      new UpdateCartItemCommand(user.id, variantId, body.quantity),
    );
  }

  @Delete('items/:variantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('variantId') variantId: string,
  ) {
    return this.commandBus.execute(
      new RemoveFromCartCommand(user.id, variantId),
    );
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  clear(@CurrentUser() user: AuthenticatedUser) {
    return this.commandBus.execute(new ClearCartCommand(user.id));
  }

  @Post('coupon')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: CartDto })
  @ApiOperation({
    summary: 'Validate and apply coupon against current cart subtotal',
  })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  applyCoupon(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ApplyCartCouponDto,
  ) {
    return this.commandBus.execute(
      new ApplyCartCouponCommand(user.id, body.code),
    );
  }

  @Delete('coupon')
  @ApiOkResponse({ type: CartDto })
  removeCoupon(@CurrentUser() user: AuthenticatedUser) {
    return this.commandBus.execute(new RemoveCartCouponCommand(user.id));
  }
}
