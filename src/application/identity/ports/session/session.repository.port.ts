import { Session } from '@/domain/entities/session';
import { CreateSessionInput } from '@/domain/factories/session.factory';
import { User } from '@/domain/entities/user';
import { NullableType } from '@/utils/types/nullable.type';
import { DeepPartial } from '@/utils/types/deep-partial.type';

type DeleteByUserIdConditions = {
  userId: User['id'];
};

type DeleteByUserIdWithExcludeConditions = DeleteByUserIdConditions & {
  excludeSessionId: Session['id'];
};

export { CreateSessionInput };

export interface SessionRepositoryPort {
  findById(id: Session['id']): Promise<NullableType<Session>>;

  create(data: CreateSessionInput): Promise<Session>;

  update(
    id: Session['id'],
    payload: DeepPartial<Omit<Session, 'id' | 'createdAt'>>,
  ): Promise<Session | null>;

  deleteById(id: Session['id']): Promise<void>;

  deleteByUserId(conditions: DeleteByUserIdConditions): Promise<void>;

  deleteByUserIdWithExclude(
    conditions: DeleteByUserIdWithExcludeConditions,
  ): Promise<void>;
}
