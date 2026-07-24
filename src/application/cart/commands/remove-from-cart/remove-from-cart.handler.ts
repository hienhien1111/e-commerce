import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { CartRepositoryPort } from '@/application/cart/ports/cart.repository.port';
import { CART_REPOSITORY_PORT } from '@/application/cart/ports/cart.repository.port.token';
import { CartItemNotFoundException } from '@/domain/exceptions/cart-item-not-found.exception';
import { ApplicationError } from '@/application/shared/errors/application.error';
import { RemoveFromCartCommand } from './remove-from-cart.command';

@CommandHandler(RemoveFromCartCommand)
export class RemoveFromCartHandler
  implements ICommandHandler<RemoveFromCartCommand>
{
  constructor(
    @Inject(CART_REPOSITORY_PORT)
    private readonly cartRepository: CartRepositoryPort,
  ) {}

  async execute(command: RemoveFromCartCommand): Promise<void> {
    return this.executeAttempt(command, true);
  }

  private async executeAttempt(
    command: RemoveFromCartCommand,
    retryOnConflict: boolean,
  ): Promise<void> {
    const cart = await this.cartRepository.findByUserId(command.userId);
    if (!cart) {
      throw new ApplicationError(
        'CART_ITEM_NOT_FOUND',
        'Cart item not found',
        'NOT_FOUND',
      );
    }
    const expectedUpdatedAt = cart.updatedAt;
    try {
      cart.removeItem(command.variantId);
    } catch (error) {
      if (error instanceof CartItemNotFoundException) {
        throw new ApplicationError(
          'CART_ITEM_NOT_FOUND',
          'Cart item not found',
          'NOT_FOUND',
        );
      }
      throw error;
    }
    try {
      await this.cartRepository.save(cart, expectedUpdatedAt);
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
