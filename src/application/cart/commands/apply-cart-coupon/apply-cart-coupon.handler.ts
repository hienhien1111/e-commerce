import {
  BadRequestException,
  Inject,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { CartRepositoryPort } from '@/application/cart/ports/cart.repository.port';
import { CART_REPOSITORY_PORT } from '@/application/cart/ports/cart.repository.port.token';
import { CartViewService } from '@/application/cart/services/cart-view.service';
import type { CouponValidationPort } from '@/application/discount/ports/coupon-validation.port';
import { COUPON_VALIDATION_PORT } from '@/application/discount/ports/coupon-validation.port.token';
import { ApplyCartCouponCommand } from './apply-cart-coupon.command';

@CommandHandler(ApplyCartCouponCommand)
export class ApplyCartCouponHandler
  implements ICommandHandler<ApplyCartCouponCommand>
{
  constructor(
    @Inject(CART_REPOSITORY_PORT)
    private readonly cartRepository: CartRepositoryPort,
    @Inject(COUPON_VALIDATION_PORT)
    private readonly couponValidation: CouponValidationPort,
    private readonly cartView: CartViewService,
  ) {}

  async execute(command: ApplyCartCouponCommand) {
    const cart = await this.cartRepository.findByUserId(command.userId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cannot apply a coupon to an empty cart');
    }
    const view = await this.cartView.build(cart);
    const result = await this.couponValidation.validateByCode(
      command.code,
      view.subtotal,
    );
    if (!result.coupon) {
      throw new UnprocessableEntityException({ reason: result.reason });
    }
    cart.applyCoupon(result.coupon.id);
    return this.cartView.build(await this.cartRepository.save(cart));
  }
}
