import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { CartRepositoryPort } from '@/application/cart/ports/cart.repository.port';
import { CART_REPOSITORY_PORT } from '@/application/cart/ports/cart.repository.port.token';
import { CartProductService } from '@/application/cart/services/cart-product.service';
import { CartViewService } from '@/application/cart/services/cart-view.service';
import { CartItemNotFoundException } from '@/domain/exceptions/cart-item-not-found.exception';
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
    const cart = await this.cartRepository.findByUserId(command.userId);
    if (!cart) throw new NotFoundException('Cart item not found');
    if (command.quantity > 0) {
      await this.products.assertSellable(command.productId, command.quantity);
    }
    try {
      cart.updateItem(command.productId, command.quantity);
    } catch (error) {
      if (error instanceof CartItemNotFoundException) {
        throw new NotFoundException('Cart item not found');
      }
      throw error;
    }
    return this.cartView.build(await this.cartRepository.save(cart));
  }
}
