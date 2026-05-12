import { ICommand } from '@nestjs/cqrs';
import { RegisterPayload } from '@/application/identity/types/command-payloads';

export class RegisterCommand implements ICommand {
  constructor(public readonly payload: RegisterPayload) {}
}
