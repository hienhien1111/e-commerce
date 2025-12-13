import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  verifyAuthenticationResponse,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import {
  LoginStrategy,
  WebAuthnLoginInput,
  LoginResult,
} from '@/domain/strategies/auth/i-auth-strategy';
import { AllConfigType } from '@/config/config.type';
import type { ChallengeStorePort } from '@/application/identity/ports/webauthn/challenge-store.port';
import type { WebAuthnCredentialRepositoryPort } from '@/application/identity/ports/webauthn/webauthn-credential.repository.port';
import type { UserRepositoryPort } from '@/application/identity/ports/user/user.repository.port';
import { CHALLENGE_STORE_PORT } from '@/application/identity/ports/webauthn/challenge-store.port.token';
import { WEBAUTHN_CREDENTIAL_REPOSITORY_PORT } from '@/application/identity/ports/webauthn/webauthn-credential.repository.port.token';
import { USER_REPOSITORY_PORT } from '@/application/identity/ports/user/user.repository.port.token';

@Injectable()
export class WebAuthnLoginStrategy
  implements LoginStrategy<WebAuthnLoginInput>
{
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    @Inject(CHALLENGE_STORE_PORT)
    private readonly challengeStore: ChallengeStorePort,
    @Inject(WEBAUTHN_CREDENTIAL_REPOSITORY_PORT)
    private readonly credentialRepository: WebAuthnCredentialRepositoryPort,
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(input: WebAuthnLoginInput): Promise<LoginResult> {
    const { response, challengeKey } = input;

    const rpId = this.configService.getOrThrow('webauthn.rpId', {
      infer: true,
    });
    const allowedOrigins = this.configService.getOrThrow(
      'webauthn.allowedOrigins',
      { infer: true },
    );

    const challengeData = await this.challengeStore.retrieve(challengeKey);
    if (challengeData?.purpose !== 'authentication') {
      throw new UnauthorizedException('Invalid or expired challenge');
    }

    await this.challengeStore.remove(challengeKey);

    const credential = await this.credentialRepository.findByCredentialId(
      response.id,
    );
    if (!credential) {
      throw new BadRequestException('Credential not found');
    }

    if (challengeData.userId && challengeData.userId !== credential.userId) {
      throw new UnauthorizedException(
        'Credential does not belong to expected user',
      );
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: allowedOrigins,
      expectedRPID: rpId,
      credential: {
        id: credential.credentialId,
        publicKey: Buffer.from(credential.publicKey, 'base64'),
        counter: credential.counter,
        transports: credential.transports
          ? (credential.transports as AuthenticatorTransportFuture[])
          : undefined,
      },
      requireUserVerification: true,
    });

    if (!verification.verified) {
      throw new BadRequestException('Authentication verification failed');
    }

    await this.credentialRepository.update(credential.id, {
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: new Date(),
    });

    const user = await this.userRepository.findById(credential.userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    return {
      user,
      isNewUser: false,
    };
  }
}
