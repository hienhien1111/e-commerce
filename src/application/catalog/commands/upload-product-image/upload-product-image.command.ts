import { ICommand } from '@nestjs/cqrs';

export class UploadProductImageCommand implements ICommand {
  constructor(
    public readonly productId: string,
    public readonly buffer: Buffer,
  ) {}
}
