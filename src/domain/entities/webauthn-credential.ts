import { BaseDomainModel } from '@/shared/domain/base-domain-model';

export interface WebAuthnCredentialEssentialProps {
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports?: string[] | null;
  backedUp: boolean;
  deviceType?: string | null;
  aaguid?: string | null;
  lastUsedAt?: Date | null;
}

type WebAuthnCredentialInternalProps = WebAuthnCredentialEssentialProps;

export class WebAuthnCredential extends BaseDomainModel<WebAuthnCredentialInternalProps> {
  private constructor(
    props: WebAuthnCredentialInternalProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(props, id, createdAt, updatedAt);
    this.validate();
  }

  static _create(
    props: WebAuthnCredentialInternalProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
  ): WebAuthnCredential {
    return new WebAuthnCredential(props, id, createdAt, updatedAt);
  }

  private validate(): void {
    if (!this.props.userId || this.props.userId.trim().length === 0) {
      throw new Error('User ID is required');
    }
    if (
      !this.props.credentialId ||
      this.props.credentialId.trim().length === 0
    ) {
      throw new Error('Credential ID is required');
    }
    if (!this.props.publicKey || this.props.publicKey.trim().length === 0) {
      throw new Error('Public key is required');
    }
    if (this.props.counter < 0) {
      throw new Error('Counter must be non-negative');
    }
  }

  get userId(): WebAuthnCredentialEssentialProps['userId'] {
    return this.props.userId;
  }

  get credentialId(): WebAuthnCredentialEssentialProps['credentialId'] {
    return this.props.credentialId;
  }

  get publicKey(): WebAuthnCredentialEssentialProps['publicKey'] {
    return this.props.publicKey;
  }

  get counter(): WebAuthnCredentialEssentialProps['counter'] {
    return this.props.counter;
  }

  get transports(): WebAuthnCredentialEssentialProps['transports'] {
    return this.props.transports;
  }

  get backedUp(): WebAuthnCredentialEssentialProps['backedUp'] {
    return this.props.backedUp;
  }

  get deviceType(): WebAuthnCredentialEssentialProps['deviceType'] {
    return this.props.deviceType;
  }

  get aaguid(): WebAuthnCredentialEssentialProps['aaguid'] {
    return this.props.aaguid;
  }

  get lastUsedAt(): WebAuthnCredentialEssentialProps['lastUsedAt'] {
    return this.props.lastUsedAt;
  }

  updateCounter(counter: number): void {
    if (counter < this.props.counter) {
      throw new Error('Counter can only increase');
    }
    this.props.counter = counter;
    this.touch();
  }

  markAsUsed(): void {
    this.props.lastUsedAt = new Date();
    this.touch();
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      userId: this.userId,
      credentialId: this.credentialId,
      publicKey: this.publicKey,
      counter: this.counter,
      transports: this.transports ?? null,
      backedUp: this.backedUp,
      deviceType: this.deviceType ?? null,
      aaguid: this.aaguid ?? null,
      lastUsedAt: this.lastUsedAt ?? null,
    };
  }
}
