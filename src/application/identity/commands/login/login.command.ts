import { ICommand } from '@nestjs/cqrs';
import { EmailLoginPayload } from '@/application/identity/types/command-payloads';
import {
  EmailPasswordLoginInput,
  WebAuthnLoginInput,
} from '@/domain/strategies/auth/i-auth-strategy';

// Union type for all possible login payloads
export type LoginPayload =
  | EmailLoginPayload
  | EmailPasswordLoginInput
  | WebAuthnLoginInput;

export class AuthLoginCommand implements ICommand {
  constructor(public readonly payload: LoginPayload) {}
}
