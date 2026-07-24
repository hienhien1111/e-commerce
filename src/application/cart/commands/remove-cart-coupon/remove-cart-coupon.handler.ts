import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { CartRepositoryPort } from '@/application/cart/ports/cart.repository.port';
import { CART_REPOSITORY_PORT } from '@/application/cart/ports/cart.repository.port.token';
import { CartViewService } from '@/application/cart/services/cart-view.service';
import { RemoveCartCouponCommand } from './remove-cart-coupon.command';
import { ApplicationError } from '@/application/shared/errors/application.error';

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
    return this.executeAttempt(command, true);
  }

  private async executeAttempt(
    command: RemoveCartCouponCommand,
    retryOnConflict: boolean,
  ) {
    const cart = await this.cartRepository.findByUserId(command.userId);
    if (!cart) return this.cartView.build(null);
    const expectedUpdatedAt = cart.updatedAt;
    cart.removeCoupon();
    try {
      return this.cartView.build(
        await this.cartRepository.save(cart, expectedUpdatedAt),
      );
    } catch (error) {
      if (
        retryOnConflict &&
        error instanceof ApplicationError &&
        error.code === 'CART_CONCURRENT_MODIFICATION'
      ) {
        return this.executeAttempt(command, false);
      }
      throw error;
    }
  }
}
