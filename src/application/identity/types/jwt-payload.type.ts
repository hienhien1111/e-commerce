import type { Session } from '@/domain/entities/session';
import type { User } from '@/domain/entities/user';

export type JwtPayloadType = Pick<User, 'id' | 'role'> & {
  sessionId: Session['id'];
  iat: number;
  exp: number;
};
