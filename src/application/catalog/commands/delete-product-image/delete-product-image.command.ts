import { ICommand } from '@nestjs/cqrs';

export class DeleteProductImageCommand implements ICommand {
  constructor(
    public readonly productId: string,
    public readonly imageId: string,
  ) {}
}
