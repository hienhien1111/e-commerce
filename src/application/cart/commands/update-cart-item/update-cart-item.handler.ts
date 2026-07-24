import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { CartRepositoryPort } from '@/application/cart/ports/cart.repository.port';
import { CART_REPOSITORY_PORT } from '@/application/cart/ports/cart.repository.port.token';
import { CartProductService } from '@/application/cart/services/cart-product.service';
import { CartViewService } from '@/application/cart/services/cart-view.service';
import { CartItemNotFoundException } from '@/domain/exceptions/cart-item-not-found.exception';
import { ApplicationError } from '@/application/shared/errors/application.error';
import { UpdateCartItemCommand } from './update-cart-item.command';

@CommandHandler(UpdateCartItemCommand)
export class UpdateCartItemHandler
  implements ICommandHandler<UpdateCartItemCommand>
{
  constructor(
    @Inject(CART_REPOSITORY_PORT)
    private readonly cartRepository: CartRepositoryPort,
    private readonly products: CartProductService,
    private readonly cartView: CartViewService,
  ) {}

  async execute(command: UpdateCartItemCommand) {
    return this.executeAttempt(command, true);
  }

  private async executeAttempt(
    command: UpdateCartItemCommand,
    retryOnConflict: boolean,
  ) {
    const cart = await this.cartRepository.findByUserId(command.userId);
    if (!cart) {
      throw new ApplicationError(
        'CART_ITEM_NOT_FOUND',
        'Cart item not found',
        'NOT_FOUND',
      );
    }
    const expectedUpdatedAt = cart.updatedAt;
    if (command.quantity > 0) {
      await this.products.assertSellable(command.variantId, command.quantity);
    }
    try {
      cart.updateItem(command.variantId, command.quantity);
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
