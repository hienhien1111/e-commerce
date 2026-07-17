import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { CartRepositoryPort } from '@/application/cart/ports/cart.repository.port';
import { CART_REPOSITORY_PORT } from '@/application/cart/ports/cart.repository.port.token';
import { CartViewService } from '@/application/cart/services/cart-view.service';
import { RemoveCartCouponCommand } from './remove-cart-coupon.command';

@CommandHandler(RemoveCartCouponCommand)
export class RemoveCartCouponHandler
  implements ICommandHandler<RemoveCartCouponCommand>
{
  constructor(
    @Inject(CART_REPOSITORY_PORT)
    private readonly cartRepository: CartRepositoryPort,
    private readonly cartView: CartViewService,
  ) {}

  async execute(command: RemoveCartCouponCommand) {
    const cart = await this.cartRepository.findByUserId(command.userId);
    if (!cart) return this.cartView.build(null);
    cart.removeCoupon();
    return this.cartView.build(await this.cartRepository.save(cart));
  }
}
