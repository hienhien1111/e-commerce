import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebAuthnCredential } from '@/domain/entities/webauthn-credential';
import { WebAuthnCredentialEntity } from '../entities/webauthn-credential.entity';
import { WebAuthnCredentialMapper } from '../mappers/webauthn-credential.mapper';
import {
  WebAuthnCredentialRepositoryPort,
  CreateWebAuthnCredentialInput,
  UpdateWebAuthnCredentialInput,
} from '@/application/identity/ports/webauthn/webauthn-credential.repository.port';
import { NullableType } from '@/utils/types/nullable.type';
import { generateUuidV7 } from '@/utils/uuid-v7';

@Injectable()
export class WebAuthnCredentialRepositoryImpl
  implements WebAuthnCredentialRepositoryPort
{
  constructor(
    @InjectRepository(WebAuthnCredentialEntity)
    private readonly repository: Repository<WebAuthnCredentialEntity>,
  ) {}

  async findByCredentialId(
    credentialId: string,
  ): Promise<NullableType<WebAuthnCredential>> {
    const entity = await this.repository.findOne({
      where: { credentialId },
    });

    if (!entity) {
      return null;
    }

    return WebAuthnCredentialMapper.toDomain(entity);
  }

  async findByUserId(userId: string): Promise<WebAuthnCredential[]> {
    const entities = await this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return entities.map((entity) => WebAuthnCredentialMapper.toDomain(entity));
  }

  async findActiveByUserId(userId: string): Promise<WebAuthnCredential[]> {
    return this.findByUserId(userId);
  }

  async create(
    data: CreateWebAuthnCredentialInput,
  ): Promise<WebAuthnCredential> {
    const persistenceEntity = this.repository.create({
      id: generateUuidV7(),
      userId: data.userId,
      credentialId: data.credentialId,
      publicKey: data.publicKey,
      counter: data.counter,
      transports: data.transports ?? null,
      backedUp: data.backedUp,
      deviceType: data.deviceType ?? null,
      aaguid: data.aaguid ?? null,
      lastUsedAt: null,
    });

    const saved = await this.repository.save(persistenceEntity);
    return WebAuthnCredentialMapper.toDomain(saved);
  }

  async update(
    id: string,
    data: UpdateWebAuthnCredentialInput,
  ): Promise<NullableType<WebAuthnCredential>> {
    const entity = await this.repository.findOne({ where: { id } });

    if (!entity) {
      return null;
    }

    const domainEntity = WebAuthnCredentialMapper.toDomain(entity);

    if (data.counter !== undefined) {
      domainEntity.updateCounter(data.counter);
    }

    if (data.lastUsedAt !== undefined) {
      domainEntity.markAsUsed();
    }

    const updatedEntity = WebAuthnCredentialMapper.toPersistence(domainEntity);
    const saved = await this.repository.save(updatedEntity);

    return WebAuthnCredentialMapper.toDomain(saved);
  }

  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
