import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { GenerateAuthenticationOptionsCommand } from './generate-authentication-options.command';
import { GenerateAuthenticationOptionsResult } from './generate-authentication-options.result';
import type { ChallengeStorePort } from '../../../ports/webauthn/challenge-store.port';
import type { WebAuthnCredentialRepositoryPort } from '../../../ports/webauthn/webauthn-credential.repository.port';
import type { UserRepositoryPort } from '../../../ports/user/user.repository.port';
import { CHALLENGE_STORE_PORT } from '../../../ports/webauthn/challenge-store.port.token';
import { WEBAUTHN_CREDENTIAL_REPOSITORY_PORT } from '../../../ports/webauthn/webauthn-credential.repository.port.token';
import { USER_REPOSITORY_PORT } from '../../../ports/user/user.repository.port.token';
import { AllConfigType } from '@/config/config.type';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
@CommandHandler(GenerateAuthenticationOptionsCommand)
export class GenerateAuthenticationOptionsHandler
  implements ICommandHandler<GenerateAuthenticationOptionsCommand>
{
  constructor(
    @Inject(CHALLENGE_STORE_PORT)
    private readonly challengeStore: ChallengeStorePort,
    @Inject(WEBAUTHN_CREDENTIAL_REPOSITORY_PORT)
    private readonly credentialRepository: WebAuthnCredentialRepositoryPort,
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async execute(
    command: GenerateAuthenticationOptionsCommand,
  ): Promise<GenerateAuthenticationOptionsResult> {
    const { userId, userEmail } = command;

    const rpId = this.configService.getOrThrow('webauthn.rpId', {
      infer: true,
    });
    const challengeTtlSec = this.configService.getOrThrow(
      'webauthn.challengeTtlSec',
      { infer: true },
    );

    let finalUserId: string | undefined;
    let allowCredentials: { id: string; type: 'public-key' }[] = [];

    if (userId || userEmail) {
      let user;
      if (userId) {
        user = await this.userRepository.findById(userId);
      } else if (userEmail) {
        user = await this.userRepository.findByEmail(userEmail);
      }

      if (!user) {
        throw new BadRequestException('User not found');
      }

      finalUserId = user.id;
      const credentials = await this.credentialRepository.findActiveByUserId(
        user.id,
      );

      if (credentials.length === 0) {
        throw new BadRequestException('No registered credentials found');
      }

      allowCredentials = credentials.map((cred) => ({
        id: cred.credentialId,
        type: 'public-key' as const,
      }));
    }

    const options = await generateAuthenticationOptions({
      rpID: rpId,
      allowCredentials:
        allowCredentials.length > 0 ? allowCredentials : undefined,
      userVerification: 'required',
    });

    const challengeKey = uuidv4();
    const expiresAt = new Date(Date.now() + challengeTtlSec * 1000);

    await this.challengeStore.store(challengeKey, {
      challenge: options.challenge,
      userId: finalUserId,
      purpose: 'authentication',
      expiresAt,
    });

    return {
      options,
      challengeKey,
    };
  }
}
