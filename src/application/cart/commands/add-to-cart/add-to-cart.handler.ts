import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { CartRepositoryPort } from '@/application/cart/ports/cart.repository.port';
import { CART_REPOSITORY_PORT } from '@/application/cart/ports/cart.repository.port.token';
import { CartProductService } from '@/application/cart/services/cart-product.service';
import { CartViewService } from '@/application/cart/services/cart-view.service';
import { CartFactory } from '@/domain/factories/cart.factory';
import { CartItemFactory } from '@/domain/factories/cart-item.factory';
import { ApplicationError } from '@/application/shared/errors/application.error';
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
    return this.executeAttempt(command, true);
  }

  private async executeAttempt(
    command: AddToCartCommand,
    retryOnConflict: boolean,
  ) {
    const existing = await this.cartRepository.findByUserId(command.userId);
    const expectedUpdatedAt = existing?.updatedAt;
    const resolved = command.variantId
      ? await this.products.assertSellable(command.variantId, command.quantity)
      : command.productId
        ? await this.products.resolveProduct(command.productId)
        : null;
    if (!resolved) {
      throw new ApplicationError(
        'CART_ITEM_TARGET_REQUIRED',
        'Product or variant is required',
        'BAD_REQUEST',
      );
    }
    const currentQuantity =
      existing?.items.find((item) => item.variantId === resolved.variantId)
        ?.quantity ?? 0;
    await this.products.assertSellable(
      resolved.variantId,
      currentQuantity + command.quantity,
    );
    const cart =
      existing ??
      CartFactory.create({ userId: command.userId, couponId: null, items: [] });
    cart.addItem(
      CartItemFactory.create({
        productId: resolved.id,
        variantId: resolved.variantId,
        quantity: command.quantity,
      }),
    );
    let saved;
    try {
      saved = existing
        ? await this.cartRepository.save(cart, expectedUpdatedAt)
        : await this.cartRepository.create(cart);
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
    return this.cartView.build(saved);
  }
}
