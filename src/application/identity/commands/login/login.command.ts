import { ICommand } from '@nestjs/cqrs';
import { AuthEmailLoginDto } from '@/presentation/http/dtos/auth-email-login.dto';
import {
  EmailPasswordLoginInput,
  WebAuthnLoginInput,
} from '@/domain/strategies/auth/i-auth-strategy';

// Union type for all possible login payloads
export type LoginPayload =
  | AuthEmailLoginDto
  | EmailPasswordLoginInput
  | WebAuthnLoginInput;

export class AuthLoginCommand implements ICommand {
  constructor(public readonly payload: LoginPayload) {}
}
