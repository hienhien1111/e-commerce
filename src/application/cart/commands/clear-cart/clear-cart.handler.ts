import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { CartRepositoryPort } from '@/application/cart/ports/cart.repository.port';
import { CART_REPOSITORY_PORT } from '@/application/cart/ports/cart.repository.port.token';
import { ClearCartCommand } from './clear-cart.command';

@CommandHandler(ClearCartCommand)
export class ClearCartHandler implements ICommandHandler<ClearCartCommand> {
  constructor(
    @Inject(CART_REPOSITORY_PORT)
    private readonly cartRepository: CartRepositoryPort,
  ) {}

  async execute(command: ClearCartCommand): Promise<void> {
    await this.cartRepository.deleteByUserId(command.userId);
  }
}
