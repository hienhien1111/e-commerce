import { ICommand } from '@nestjs/cqrs';

export class ResendConfirmationCommand implements ICommand {
  constructor(public readonly email: string) {}
}
