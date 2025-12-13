import { ICommand } from '@nestjs/cqrs';

export class ResetPasswordCommand implements ICommand {
  constructor(
    public readonly hash: string,
    public readonly password: string,
  ) {}
}
