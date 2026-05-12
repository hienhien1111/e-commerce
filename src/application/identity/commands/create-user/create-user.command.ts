import { ICommand } from '@nestjs/cqrs';
import { CreateUserPayload } from '@/application/identity/types/command-payloads';

export class CreateUserCommand implements ICommand {
  constructor(public readonly payload: CreateUserPayload) {}
}
