import { ICommand } from '@nestjs/cqrs';

export class RequestEmailChangeCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly currentPassword: string,
  ) {}
}
