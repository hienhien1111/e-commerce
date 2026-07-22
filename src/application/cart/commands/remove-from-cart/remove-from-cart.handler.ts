import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { CartRepositoryPort } from '@/application/cart/ports/cart.repository.port';
import { CART_REPOSITORY_PORT } from '@/application/cart/ports/cart.repository.port.token';
import { CartItemNotFoundException } from '@/domain/exceptions/cart-item-not-found.exception';
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
    const cart = await this.cartRepository.findByUserId(command.userId);
    if (!cart) throw new NotFoundException('Cart item not found');
    try {
      cart.removeItem(command.variantId);
    } catch (error) {
      if (error instanceof CartItemNotFoundException) {
        throw new NotFoundException('Cart item not found');
      }
      throw error;
    }
    await this.cartRepository.save(cart);
  }
}
