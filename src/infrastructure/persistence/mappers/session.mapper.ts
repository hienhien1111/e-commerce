import { UserEntity } from '@/infrastructure/persistence/entities/user.entity';
import { UserMapper } from '@/infrastructure/persistence/mappers/user.mapper';
import { SessionFactory } from '@/domain/factories/session.factory';
import { Session } from '@/domain/entities/session';
import { SessionEntity } from '../entities/session.entity';

export class SessionMapper {
  static toDomain(raw: SessionEntity): Session {
    if (!raw.user) {
      throw new Error('Session entity must have a user');
    }

    return SessionFactory.reconstitute({
      id: raw.id,
      user: UserMapper.toDomain(raw.user),
      hash: raw.hash,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt ?? undefined,
    });
  }

  static toPersistence(domainEntity: Session): SessionEntity {
    const user = new UserEntity();
    user.id = domainEntity.user.id;

    const persistenceEntity = new SessionEntity();
    persistenceEntity.id = domainEntity.id;
    persistenceEntity.hash = domainEntity.hash;
    persistenceEntity.user = user;
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;
    persistenceEntity.deletedAt = domainEntity.deletedAt ?? null;

    return persistenceEntity;
  }
}
