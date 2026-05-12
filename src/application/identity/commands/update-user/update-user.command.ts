import { ICommand } from '@nestjs/cqrs';
import { UpdateUserPayload } from '@/application/identity/types/command-payloads';

export class UpdateUserCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly payload: UpdateUserPayload,
  ) {}
}
