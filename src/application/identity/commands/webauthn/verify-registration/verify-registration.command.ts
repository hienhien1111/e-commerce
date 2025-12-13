import type { RegistrationResponseJSON } from '@simplewebauthn/types';

export class VerifyRegistrationCommand {
  constructor(
    public readonly userId: string,
    public readonly response: RegistrationResponseJSON,
    public readonly challengeKey: string,
  ) {}
}
