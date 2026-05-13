import { Injectable } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WebAuthnCredential } from '@/domain/entities/webauthn-credential';
import { WebAuthnCredentialMapper } from '../mappers/webauthn-credential.mapper';
import {
  WebAuthnCredentialRepositoryPort,
  CreateWebAuthnCredentialInput,
  UpdateWebAuthnCredentialInput,
} from '@/application/identity/ports/webauthn/webauthn-credential.repository.port';
import { NullableType } from '@/utils/types/nullable.type';
import { generateUuidV7 } from '@/utils/uuid-v7';

@Injectable()
export class PrismaWebAuthnCredentialRepository
  implements WebAuthnCredentialRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  async findByCredentialId(
    credentialId: string,
  ): Promise<NullableType<WebAuthnCredential>> {
    const row = await this.prisma.webAuthnCredential.findUnique({
      where: { credentialId },
    });

    return row ? WebAuthnCredentialMapper.toDomain(row) : null;
  }

  async findByUserId(userId: string): Promise<WebAuthnCredential[]> {
    const rows = await this.prisma.webAuthnCredential.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => WebAuthnCredentialMapper.toDomain(row));
  }

  async findActiveByUserId(userId: string): Promise<WebAuthnCredential[]> {
    return this.findByUserId(userId);
  }

  async create(
    data: CreateWebAuthnCredentialInput,
  ): Promise<WebAuthnCredential> {
    const created = await this.prisma.webAuthnCredential.create({
      data: {
        id: generateUuidV7(),
        userId: data.userId,
        credentialId: data.credentialId,
        publicKey: data.publicKey,
        counter: BigInt(data.counter),
        transports:
          data.transports === null
            ? Prisma.JsonNull
            : (data.transports as Prisma.InputJsonValue),
        backedUp: data.backedUp,
        deviceType: data.deviceType,
        aaguid: data.aaguid,
        lastUsedAt: null,
      },
    });

    return WebAuthnCredentialMapper.toDomain(created);
  }

  async update(
    id: string,
    data: UpdateWebAuthnCredentialInput,
  ): Promise<NullableType<WebAuthnCredential>> {
    const existing = await this.prisma.webAuthnCredential.findUnique({
      where: { id },
    });

    if (!existing) {
      return null;
    }

    const domainEntity = WebAuthnCredentialMapper.toDomain(existing);

    if (data.counter !== undefined) {
      domainEntity.updateCounter(data.counter);
    }
    if (data.lastUsedAt !== undefined) {
      domainEntity.markAsUsed();
    }

    const persistence = WebAuthnCredentialMapper.toPersistence(domainEntity);

    const updated = await this.prisma.webAuthnCredential.update({
      where: { id },
      data: {
        counter: persistence.counter,
        lastUsedAt: persistence.lastUsedAt,
        updatedAt: persistence.updatedAt,
      },
    });

    return WebAuthnCredentialMapper.toDomain(updated);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.webAuthnCredential.delete({ where: { id } });
  }
}
