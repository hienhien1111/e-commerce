import { ICommand } from '@nestjs/cqrs';

export class ConfirmNewEmailCommand implements ICommand {
  constructor(public readonly hash: string) {}
}
