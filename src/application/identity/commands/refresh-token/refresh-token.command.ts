import { ICommand } from '@nestjs/cqrs';

export class RefreshTokenCommand implements ICommand {
  constructor(
    public readonly sessionId: string,
    public readonly hash: string,
  ) {}
}
