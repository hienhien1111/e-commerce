import { Injectable } from '@nestjs/common';
import {
  LoginStrategy,
  EmailPasswordLoginInput,
  WebAuthnLoginInput,
} from '@/domain/strategies/auth/i-auth-strategy';
import { EmailPasswordLoginStrategy } from '../strategies/email-password-auth.strategy';
import { WebAuthnLoginStrategy } from '../strategies/passkey-auth.strategy';

type LoginInput = EmailPasswordLoginInput | WebAuthnLoginInput;

@Injectable()
export class LoginStrategyResolver {
  constructor(
    private readonly emailPasswordStrategy: EmailPasswordLoginStrategy,
    private readonly webAuthnStrategy: WebAuthnLoginStrategy,
  ) {}

  resolve(payload: LoginInput): LoginStrategy<LoginInput> {
    if (this.isWebAuthnInput(payload)) {
      return this.webAuthnStrategy as LoginStrategy<LoginInput>;
    }

    if (this.isEmailPasswordInput(payload)) {
      return this.emailPasswordStrategy as LoginStrategy<LoginInput>;
    }

    throw new Error('Unknown login type');
  }

  private isWebAuthnInput(payload: LoginInput): payload is WebAuthnLoginInput {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'response' in payload &&
      'challengeKey' in payload &&
      typeof payload.challengeKey === 'string'
    );
  }

  private isEmailPasswordInput(
    payload: LoginInput,
  ): payload is EmailPasswordLoginInput {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'email' in payload &&
      'password' in payload &&
      typeof payload.email === 'string' &&
      typeof payload.password === 'string'
    );
  }
}
