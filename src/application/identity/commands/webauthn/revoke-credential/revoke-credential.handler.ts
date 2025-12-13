import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { RevokeCredentialCommand } from './revoke-credential.command';
import { RevokeCredentialResult } from './revoke-credential.result';
import type { WebAuthnCredentialRepositoryPort } from '../../../ports/webauthn/webauthn-credential.repository.port';
import { WEBAUTHN_CREDENTIAL_REPOSITORY_PORT } from '../../../ports/webauthn/webauthn-credential.repository.port.token';

@Injectable()
@CommandHandler(RevokeCredentialCommand)
export class RevokeCredentialHandler
  implements ICommandHandler<RevokeCredentialCommand>
{
  constructor(
    @Inject(WEBAUTHN_CREDENTIAL_REPOSITORY_PORT)
    private readonly credentialRepository: WebAuthnCredentialRepositoryPort,
  ) {}

  async execute(
    command: RevokeCredentialCommand,
  ): Promise<RevokeCredentialResult> {
    const { credentialId, userId } = command;

    const credential =
      await this.credentialRepository.findByCredentialId(credentialId);

    if (!credential) {
      throw new NotFoundException('Credential not found');
    }

    if (credential.userId !== userId) {
      throw new ForbiddenException(
        'Cannot revoke credential belonging to another user',
      );
    }

    await this.credentialRepository.remove(credential.id);

    return { success: true, message: 'Credential revoked successfully' };
  }
}
