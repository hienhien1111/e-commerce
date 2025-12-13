import { Inject, Injectable } from '@nestjs/common';
import { Session } from '@/domain/entities/session';
import { User } from '@/domain/entities/user';
import { NullableType } from '@/utils/types/nullable.type';
import { DeepPartial } from '@/utils/types/deep-partial.type';
import {
  CreateSessionInput,
  SessionRepositoryPort as AuthSessionRepositoryPort,
} from '@/application/identity/ports/session/session.repository.port';
import type { SessionRepositoryPort as SessionModuleRepositoryPort } from '@/application/identity/ports/session/session.repository.port';
import { SESSION_REPOSITORY_PORT as SESSION_MODULE_REPOSITORY_PORT } from '@/application/identity/ports/session/session.repository.port.token';

@Injectable()
export class SessionRepositoryImpl implements AuthSessionRepositoryPort {
  constructor(
    @Inject(SESSION_MODULE_REPOSITORY_PORT)
    private readonly sessionModuleRepository: SessionModuleRepositoryPort,
  ) {}

  findById(id: Session['id']): Promise<NullableType<Session>> {
    return this.sessionModuleRepository.findById(id);
  }

  create(data: CreateSessionInput): Promise<Session> {
    return this.sessionModuleRepository.create(data);
  }

  update(
    id: Session['id'],
    payload: DeepPartial<Omit<Session, 'id' | 'createdAt'>>,
  ): Promise<Session | null> {
    return this.sessionModuleRepository.update(id, payload);
  }

  deleteById(id: Session['id']): Promise<void> {
    return this.sessionModuleRepository.deleteById(id);
  }

  deleteByUserId(conditions: { userId: User['id'] }): Promise<void> {
    return this.sessionModuleRepository.deleteByUserId(conditions);
  }

  deleteByUserIdWithExclude(conditions: {
    userId: User['id'];
    excludeSessionId: Session['id'];
  }): Promise<void> {
    return this.sessionModuleRepository.deleteByUserIdWithExclude(conditions);
  }
}
