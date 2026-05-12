import { Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SessionRepositoryPort } from '@/application/identity/ports/session/session.repository.port';
import { Session } from '@/domain/entities/session';
import {
  SessionFactory,
  CreateSessionInput,
} from '@/domain/factories/session.factory';
import { SessionMapper } from '../mappers/session.mapper';
import { NullableType } from '@/utils/types/nullable.type';
import { DeepPartial } from '@/utils/types/deep-partial.type';
import { User } from '@/domain/entities/user';

const SESSION_WITH_USER_INCLUDE = {
  user: {
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  },
} as const satisfies Prisma.SessionInclude;

@Injectable()
export class PrismaSessionRepository implements SessionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: Session['id']): Promise<NullableType<Session>> {
    const row = await this.prisma.session.findUnique({
      where: { id },
      include: SESSION_WITH_USER_INCLUDE,
    });

    return row ? SessionMapper.toDomain(row) : null;
  }

  async create(data: CreateSessionInput): Promise<Session> {
    const domainEntity = SessionFactory.create(data);
    const persistence = SessionMapper.toPersistence(domainEntity);

    const created = await this.prisma.session.create({
      data: {
        id: persistence.id,
        userId: persistence.userId,
        hash: persistence.hash,
        createdAt: persistence.createdAt,
        updatedAt: persistence.updatedAt,
        deletedAt: persistence.deletedAt,
      },
      include: SESSION_WITH_USER_INCLUDE,
    });

    return SessionMapper.toDomain(created);
  }

  async update(
    id: Session['id'],
    payload: DeepPartial<Omit<Session, 'id' | 'createdAt'>>,
  ): Promise<Session | null> {
    const existing = await this.prisma.session.findUnique({
      where: { id },
      include: SESSION_WITH_USER_INCLUDE,
    });

    if (!existing) {
      return null;
    }

    const domainEntity = SessionMapper.toDomain(existing);

    if (payload.hash !== undefined) {
      domainEntity.updateHash(payload.hash);
    }

    const persistence = SessionMapper.toPersistence(domainEntity);

    const updated = await this.prisma.session.update({
      where: { id },
      data: {
        hash: persistence.hash,
        updatedAt: persistence.updatedAt,
        deletedAt: persistence.deletedAt,
      },
      include: SESSION_WITH_USER_INCLUDE,
    });

    return SessionMapper.toDomain(updated);
  }

  async deleteById(id: Session['id']): Promise<void> {
    await this.prisma.session.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async deleteByUserId(conditions: { userId: User['id'] }): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId: conditions.userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async deleteByUserIdWithExclude(conditions: {
    userId: User['id'];
    excludeSessionId: Session['id'];
  }): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        userId: conditions.userId,
        id: { not: conditions.excludeSessionId },
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });
  }
}
