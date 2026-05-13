import { Injectable } from '@nestjs/common';
import {
  LoginResult,
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

  execute(payload: LoginInput): Promise<LoginResult> {
    if (this.isWebAuthnInput(payload)) {
      return this.webAuthnStrategy.execute(payload);
    }
    if (this.isEmailPasswordInput(payload)) {
      return this.emailPasswordStrategy.execute(payload);
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
