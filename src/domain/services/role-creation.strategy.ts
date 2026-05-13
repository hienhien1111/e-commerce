import { Role, RoleEssentialProps } from '../entities/role';
import { Permission } from '@/domain/entities/permission';

export interface RoleCreationStrategy<TInput> {
  execute(input: TInput): Role;
}

export type CreateRoleInput = RoleEssentialProps & {
  permissions: Permission[] | null;
};

export type ReconstituteRoleInput = RoleEssentialProps &
  Required<Pick<Role, 'id' | 'createdAt' | 'updatedAt'>> & {
    permissions: Permission[] | null;
  };
