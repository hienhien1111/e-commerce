import type { User } from '@/domain/entities/user';
import type { Role } from '@/domain/entities/role';

/** Application-layer query criteria — plain TS, no framework decorators. */

export interface UserFilterCriteria {
  roles?: Pick<Role, 'id'>[] | null;
  search?: string;
}

export interface UserSortCriteria {
  orderBy: keyof User;
  order: 'ASC' | 'DESC';
}
