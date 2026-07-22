import { ICommand } from '@nestjs/cqrs';

export class RemoveFromCartCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly productId: string,
  ) {}
}
