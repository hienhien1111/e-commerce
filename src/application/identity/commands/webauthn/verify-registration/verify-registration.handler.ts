import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  Inject,
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { VerifyRegistrationCommand } from './verify-registration.command';
import { VerifyRegistrationResult } from './verify-registration.result';
import type { ChallengeStorePort } from '../../../ports/webauthn/challenge-store.port';
import type { WebAuthnCredentialRepositoryPort } from '../../../ports/webauthn/webauthn-credential.repository.port';
import { CHALLENGE_STORE_PORT } from '../../../ports/webauthn/challenge-store.port.token';
import { WEBAUTHN_CREDENTIAL_REPOSITORY_PORT } from '../../../ports/webauthn/webauthn-credential.repository.port.token';
import { AllConfigType } from '@/config/config.type';

@Injectable()
@CommandHandler(VerifyRegistrationCommand)
export class VerifyRegistrationHandler
  implements ICommandHandler<VerifyRegistrationCommand>
{
  constructor(
    @Inject(CHALLENGE_STORE_PORT)
    private readonly challengeStore: ChallengeStorePort,
    @Inject(WEBAUTHN_CREDENTIAL_REPOSITORY_PORT)
    private readonly credentialRepository: WebAuthnCredentialRepositoryPort,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async execute(
    command: VerifyRegistrationCommand,
  ): Promise<VerifyRegistrationResult> {
    const { userId, response, challengeKey } = command;

    const rpId = this.configService.getOrThrow('webauthn.rpId', {
      infer: true,
    });
    const allowedOrigins = this.configService.getOrThrow(
      'webauthn.allowedOrigins',
      { infer: true },
    );

    const challengeData = await this.challengeStore.retrieve(challengeKey);
    if (
      !challengeData ||
      challengeData.purpose !== 'registration' ||
      challengeData.userId !== userId
    ) {
      throw new UnauthorizedException('Invalid or expired challenge');
    }

    await this.challengeStore.remove(challengeKey);

    const existingCredential =
      await this.credentialRepository.findByCredentialId(response.id);
    if (existingCredential) {
      throw new BadRequestException('Credential already registered');
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: allowedOrigins,
      expectedRPID: rpId,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException('Registration verification failed');
    }

    const { registrationInfo } = verification;

    const credential = await this.credentialRepository.create({
      userId,
      credentialId: registrationInfo.credential.id,
      publicKey: Buffer.from(registrationInfo.credential.publicKey).toString(
        'base64',
      ),
      counter: registrationInfo.credential.counter,
      transports: response.response.transports || null,
      backedUp: registrationInfo.credentialBackedUp,
      deviceType: registrationInfo.credentialDeviceType,
      aaguid: registrationInfo.aaguid || null,
    });

    return {
      verified: true,
      credentialId: credential.id,
    };
  }
}
