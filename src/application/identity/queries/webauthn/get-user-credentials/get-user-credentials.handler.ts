import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { GetUserCredentialsQuery } from './get-user-credentials.query';
import { GetUserCredentialsResult } from './get-user-credentials.result';
import type { WebAuthnCredentialRepositoryPort } from '../../../ports/webauthn/webauthn-credential.repository.port';
import { WEBAUTHN_CREDENTIAL_REPOSITORY_PORT } from '../../../ports/webauthn/webauthn-credential.repository.port.token';

@Injectable()
@QueryHandler(GetUserCredentialsQuery)
export class GetUserCredentialsHandler
  implements IQueryHandler<GetUserCredentialsQuery>
{
  constructor(
    @Inject(WEBAUTHN_CREDENTIAL_REPOSITORY_PORT)
    private readonly credentialRepository: WebAuthnCredentialRepositoryPort,
  ) {}

  async execute(
    query: GetUserCredentialsQuery,
  ): Promise<GetUserCredentialsResult> {
    const { userId } = query;

    const credentials = await this.credentialRepository.findByUserId(userId);

    return credentials.map((cred) => ({
      id: cred.id,
      credentialId: cred.credentialId,
      deviceType: cred.deviceType,
      backedUp: cred.backedUp,
      transports: cred.transports,
      createdAt: cred.createdAt,
      lastUsedAt: cred.lastUsedAt,
    }));
  }
}
