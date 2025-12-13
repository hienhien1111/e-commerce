import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { SessionEntity } from '../entities/session.entity';
import { NullableType } from '@/utils/types/nullable.type';
import { DeepPartial } from '@/utils/types/deep-partial.type';
import type { SessionRepositoryPort } from '@/application/identity/ports/session/session.repository.port';
import { Session } from '@/domain/entities/session';
import {
  SessionFactory,
  CreateSessionInput,
} from '@/domain/factories/session.factory';
import { SessionMapper } from '../mappers/session.mapper';
import { User } from '@/domain/entities/user';

@Injectable()
export class TypeOrmSessionRepository implements SessionRepositoryPort {
  constructor(
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
  ) {}

  async findById(id: Session['id']): Promise<NullableType<Session>> {
    const entity = await this.sessionRepository.findOne({
      where: {
        id,
      },
      relations: ['user'],
    });

    return entity ? SessionMapper.toDomain(entity) : null;
  }

  async create(data: CreateSessionInput): Promise<Session> {
    const domainEntity = SessionFactory.create(data);
    const persistenceModel = SessionMapper.toPersistence(domainEntity);
    const savedEntity = await this.sessionRepository.save(
      this.sessionRepository.create(persistenceModel),
    );
    return SessionMapper.toDomain(savedEntity);
  }

  async update(
    id: Session['id'],
    payload: DeepPartial<Omit<Session, 'id' | 'createdAt'>>,
  ): Promise<Session | null> {
    const entity = await this.sessionRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!entity) {
      return null;
    }

    const domainEntity = SessionMapper.toDomain(entity);

    if (payload.hash !== undefined) {
      domainEntity.updateHash(payload.hash);
    }

    const updatedEntity = await this.sessionRepository.save(
      SessionMapper.toPersistence(domainEntity),
    );

    return SessionMapper.toDomain(updatedEntity);
  }

  async deleteById(id: Session['id']): Promise<void> {
    await this.sessionRepository.softDelete({
      id,
    });
  }

  async deleteByUserId(conditions: { userId: User['id'] }): Promise<void> {
    await this.sessionRepository.softDelete({
      user: {
        id: conditions.userId,
      },
    });
  }

  async deleteByUserIdWithExclude(conditions: {
    userId: User['id'];
    excludeSessionId: Session['id'];
  }): Promise<void> {
    await this.sessionRepository.softDelete({
      user: {
        id: conditions.userId,
      },
      id: Not(conditions.excludeSessionId),
    });
  }
}
