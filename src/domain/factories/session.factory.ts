import { Session, SessionEssentialProps } from '../entities/session';
import { generateUuidV7 } from '@/utils/uuid-v7';

export type CreateSessionInput = SessionEssentialProps;

export type ReconstituteSessionInput = SessionEssentialProps &
  Required<Pick<Session, 'id' | 'createdAt' | 'updatedAt'>> & {
    deletedAt: Date | null;
  };

export class SessionFactory {
  static create(input: CreateSessionInput): Session {
    return Session._create(
      {
        user: input.user,
        hash: input.hash,
      },
      generateUuidV7(),
    );
  }

  static reconstitute(input: ReconstituteSessionInput): Session {
    return Session._create(
      {
        user: input.user,
        hash: input.hash,
      },
      input.id,
      input.createdAt,
      input.updatedAt,
      input.deletedAt,
    );
  }
}
