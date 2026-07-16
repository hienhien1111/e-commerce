import { ICommand } from '@nestjs/cqrs';

export class UploadAvatarCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly buffer: Buffer,
  ) {}
}
