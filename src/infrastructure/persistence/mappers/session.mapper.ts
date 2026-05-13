import type {
  Session as PrismaSession,
  User as PrismaUser,
} from '@/generated/prisma/client';
import { SessionFactory } from '@/domain/factories/session.factory';
import { Session } from '@/domain/entities/session';
import {
  UserMapper,
  type PrismaUserWithRelations,
} from '@/infrastructure/persistence/mappers/user.mapper';

export type PrismaSessionWithUser = PrismaSession & {
  user?: PrismaUserWithRelations | PrismaUser | null;
};

export class SessionMapper {
  static toDomain(raw: PrismaSessionWithUser): Session {
    if (!raw.user) {
      throw new Error('Session row must include the related user');
    }

    return SessionFactory.reconstitute({
      id: raw.id,
      user: UserMapper.toDomain(raw.user as PrismaUserWithRelations),
      hash: raw.hash,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
    });
  }

  /**
   * Returns scalar columns suitable for `prisma.session.create({ data })` /
   * `prisma.session.update({ data })`. The relation is set via `userId`.
   */
  static toPersistence(domainEntity: Session): {
    id: string;
    userId: string;
    hash: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  } {
    return {
      id: domainEntity.id,
      userId: domainEntity.user.id,
      hash: domainEntity.hash,
      createdAt: domainEntity.createdAt,
      updatedAt: domainEntity.updatedAt,
      deletedAt: domainEntity.deletedAt,
    };
  }
}
