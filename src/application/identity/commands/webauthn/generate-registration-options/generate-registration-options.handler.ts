import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { GenerateRegistrationOptionsCommand } from './generate-registration-options.command';
import { GenerateRegistrationOptionsResult } from './generate-registration-options.result';
import type { ChallengeStorePort } from '../../../ports/webauthn/challenge-store.port';
import type { WebAuthnCredentialRepositoryPort } from '../../../ports/webauthn/webauthn-credential.repository.port';
import { CHALLENGE_STORE_PORT } from '../../../ports/webauthn/challenge-store.port.token';
import { WEBAUTHN_CREDENTIAL_REPOSITORY_PORT } from '../../../ports/webauthn/webauthn-credential.repository.port.token';
import { AllConfigType } from '@/config/config.type';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
@CommandHandler(GenerateRegistrationOptionsCommand)
export class GenerateRegistrationOptionsHandler
  implements ICommandHandler<GenerateRegistrationOptionsCommand>
{
  constructor(
    @Inject(CHALLENGE_STORE_PORT)
    private readonly challengeStore: ChallengeStorePort,
    @Inject(WEBAUTHN_CREDENTIAL_REPOSITORY_PORT)
    private readonly credentialRepository: WebAuthnCredentialRepositoryPort,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async execute(
    command: GenerateRegistrationOptionsCommand,
  ): Promise<GenerateRegistrationOptionsResult> {
    const { userId, userDisplayName, userEmail } = command;

    const rpId = this.configService.getOrThrow('webauthn.rpId', {
      infer: true,
    });
    const rpName = this.configService.getOrThrow('webauthn.rpName', {
      infer: true,
    });
    const challengeTtlSec = this.configService.getOrThrow(
      'webauthn.challengeTtlSec',
      { infer: true },
    );

    const existingCredentials =
      await this.credentialRepository.findActiveByUserId(userId);
    const excludeCredentials = existingCredentials.map((cred) => ({
      id: cred.credentialId,
      type: 'public-key' as const,
    }));

    const options = await generateRegistrationOptions({
      rpName,
      rpID: rpId,
      userID: new TextEncoder().encode(userId),
      userName: userEmail,
      userDisplayName,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      supportedAlgorithmIDs: [-7, -257],
    });

    const challengeKey = uuidv4();
    const expiresAt = new Date(Date.now() + challengeTtlSec * 1000);

    await this.challengeStore.store(challengeKey, {
      challenge: options.challenge,
      userId,
      purpose: 'registration',
      expiresAt,
    });

    return {
      options,
      challengeKey,
    };
  }
}
