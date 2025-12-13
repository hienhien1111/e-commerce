import {
  WebAuthnCredential,
  WebAuthnCredentialEssentialProps,
} from '../entities/webauthn-credential';

export type CreateWebAuthnCredentialInput = WebAuthnCredentialEssentialProps & {
  id: string;
};

export type ReconstituteWebAuthnCredentialInput =
  WebAuthnCredentialEssentialProps & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
  };

export class WebAuthnCredentialFactory {
  static create(input: CreateWebAuthnCredentialInput): WebAuthnCredential {
    return WebAuthnCredential._create(
      {
        userId: input.userId,
        credentialId: input.credentialId,
        publicKey: input.publicKey,
        counter: input.counter,
        transports: input.transports ?? null,
        backedUp: input.backedUp,
        deviceType: input.deviceType ?? null,
        aaguid: input.aaguid ?? null,
        lastUsedAt: input.lastUsedAt ?? null,
      },
      input.id,
    );
  }

  static reconstitute(
    input: ReconstituteWebAuthnCredentialInput,
  ): WebAuthnCredential {
    return WebAuthnCredential._create(
      {
        userId: input.userId,
        credentialId: input.credentialId,
        publicKey: input.publicKey,
        counter: input.counter,
        transports: input.transports ?? null,
        backedUp: input.backedUp,
        deviceType: input.deviceType ?? null,
        aaguid: input.aaguid ?? null,
        lastUsedAt: input.lastUsedAt ?? null,
      },
      input.id,
      input.createdAt,
      input.updatedAt,
    );
  }
}
