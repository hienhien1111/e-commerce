import { WebAuthnCredential } from '@/domain/entities/webauthn-credential';
import { NullableType } from '@/utils/types/nullable.type';

export interface CreateWebAuthnCredentialInput {
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports?: string[] | null;
  backedUp: boolean;
  deviceType?: string | null;
  aaguid?: string | null;
}

export interface UpdateWebAuthnCredentialInput {
  counter?: number;
  lastUsedAt?: Date;
}

export interface WebAuthnCredentialRepositoryPort {
  findByCredentialId(
    credentialId: string,
  ): Promise<NullableType<WebAuthnCredential>>;

  findByUserId(userId: string): Promise<WebAuthnCredential[]>;

  findActiveByUserId(userId: string): Promise<WebAuthnCredential[]>;

  create(data: CreateWebAuthnCredentialInput): Promise<WebAuthnCredential>;

  update(
    id: string,
    data: UpdateWebAuthnCredentialInput,
  ): Promise<NullableType<WebAuthnCredential>>;

  remove(id: string): Promise<void>;
}
