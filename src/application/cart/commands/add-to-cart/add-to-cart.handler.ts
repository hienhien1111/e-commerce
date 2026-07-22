import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { CartRepositoryPort } from '@/application/cart/ports/cart.repository.port';
import { CART_REPOSITORY_PORT } from '@/application/cart/ports/cart.repository.port.token';
import { CartProductService } from '@/application/cart/services/cart-product.service';
import { CartViewService } from '@/application/cart/services/cart-view.service';
import { CartFactory } from '@/domain/factories/cart.factory';
import { CartItemFactory } from '@/domain/factories/cart-item.factory';
import { AddToCartCommand } from './add-to-cart.command';

@CommandHandler(AddToCartCommand)
export class AddToCartHandler implements ICommandHandler<AddToCartCommand> {
  constructor(
    @Inject(CART_REPOSITORY_PORT)
    private readonly cartRepository: CartRepositoryPort,
    private readonly products: CartProductService,
    private readonly cartView: CartViewService,
  ) {}

  async execute(command: AddToCartCommand) {
    const existing = await this.cartRepository.findByUserId(command.userId);
    const currentQuantity =
      existing?.items.find((item) => item.productId === command.productId)
        ?.quantity ?? 0;
    await this.products.assertSellable(
      command.productId,
      currentQuantity + command.quantity,
    );
    const cart =
      existing ??
      CartFactory.create({ userId: command.userId, couponId: null, items: [] });
    cart.addItem(
      CartItemFactory.create({
        productId: command.productId,
        quantity: command.quantity,
      }),
    );
    const saved = existing
      ? await this.cartRepository.save(cart)
      : await this.cartRepository.create(cart);
    return this.cartView.build(saved);
  }
}
