import { User, UserEssentialProps } from '../entities/user';
import { Role } from '@/domain/entities/role';

export interface UserCreationStrategy<TInput> {
  execute(input: TInput): User;
}

export type CreateUserInput = UserEssentialProps & {
  role: Role | null;
};

export type CreateUserWithRoleInput = UserEssentialProps & {
  role: Role | null;
};

export type CreateUserWithRoleIdInput = UserEssentialProps & {
  roleId: string | null;
};

export type ReconstituteUserInput = UserEssentialProps &
  Required<Pick<User, 'id' | 'createdAt' | 'updatedAt'>> & {
    role: Role | null;
    roleId: string | null;
    deletedAt: Date | null;
  };
