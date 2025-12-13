import { WebAuthnCredential } from '@/domain/entities/webauthn-credential';
import { WebAuthnCredentialEntity } from '../entities/webauthn-credential.entity';

export class WebAuthnCredentialMapper {
  static toDomain(raw: WebAuthnCredentialEntity): WebAuthnCredential {
    return WebAuthnCredential._create(
      {
        userId: raw.userId,
        credentialId: raw.credentialId,
        publicKey: raw.publicKey,
        counter: raw.counter,
        transports: raw.transports ?? null,
        backedUp: raw.backedUp,
        deviceType: raw.deviceType ?? null,
        aaguid: raw.aaguid ?? null,
        lastUsedAt: raw.lastUsedAt ?? null,
      },
      raw.id,
      raw.createdAt,
      raw.updatedAt,
    );
  }

  static toPersistence(
    domainEntity: WebAuthnCredential,
  ): WebAuthnCredentialEntity {
    const persistenceEntity = new WebAuthnCredentialEntity();
    persistenceEntity.id = domainEntity.id;
    persistenceEntity.userId = domainEntity.userId;
    persistenceEntity.credentialId = domainEntity.credentialId;
    persistenceEntity.publicKey = domainEntity.publicKey;
    persistenceEntity.counter = domainEntity.counter;
    persistenceEntity.transports = domainEntity.transports ?? null;
    persistenceEntity.backedUp = domainEntity.backedUp;
    persistenceEntity.deviceType = domainEntity.deviceType ?? null;
    persistenceEntity.aaguid = domainEntity.aaguid ?? null;
    persistenceEntity.lastUsedAt = domainEntity.lastUsedAt ?? null;
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
