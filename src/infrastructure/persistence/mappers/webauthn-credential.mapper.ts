import type { WebAuthnCredential as PrismaWebAuthnCredential } from '@/generated/prisma/client';
import { WebAuthnCredential } from '@/domain/entities/webauthn-credential';

/**
 * Prisma row shape — `transports` is `Json?` and `counter` is `bigint`,
 * narrowed/converted to domain types at this boundary.
 */
type PrismaWebAuthnCredentialLike = Omit<
  PrismaWebAuthnCredential,
  'transports' | 'counter'
> & {
  transports: unknown;
  counter: bigint | number;
};

function parseTransports(value: unknown): string[] | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }
  return null;
}

export class WebAuthnCredentialMapper {
  static toDomain(raw: PrismaWebAuthnCredentialLike): WebAuthnCredential {
    return WebAuthnCredential._create(
      {
        userId: raw.userId,
        credentialId: raw.credentialId,
        publicKey: raw.publicKey,
        counter:
          typeof raw.counter === 'bigint' ? Number(raw.counter) : raw.counter,
        transports: parseTransports(raw.transports),
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

  /**
   * Returns a plain object suitable for `prisma.webAuthnCredential.create({ data })`
   * or `prisma.webAuthnCredential.update({ data })`. `counter` is converted
   * to `bigint` (Prisma `BigInt`) and `transports` is serialised as JSON.
   */
  static toPersistence(domainEntity: WebAuthnCredential): {
    id: string;
    userId: string;
    credentialId: string;
    publicKey: string;
    counter: bigint;
    transports: unknown;
    backedUp: boolean;
    deviceType: string | null;
    aaguid: string | null;
    lastUsedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: domainEntity.id,
      userId: domainEntity.userId,
      credentialId: domainEntity.credentialId,
      publicKey: domainEntity.publicKey,
      counter: BigInt(domainEntity.counter),
      transports: domainEntity.transports ?? null,
      backedUp: domainEntity.backedUp,
      deviceType: domainEntity.deviceType ?? null,
      aaguid: domainEntity.aaguid ?? null,
      lastUsedAt: domainEntity.lastUsedAt ?? null,
      createdAt: domainEntity.createdAt,
      updatedAt: domainEntity.updatedAt,
    };
  }
}
