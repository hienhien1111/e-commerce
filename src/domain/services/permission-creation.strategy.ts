import { Permission, PermissionEssentialProps } from '../entities/permission';

export interface PermissionCreationStrategy<TInput> {
  execute(input: TInput): Permission;
}

export type CreatePermissionInput = PermissionEssentialProps;

export type ReconstitutePermissionInput = PermissionEssentialProps &
  Required<Pick<Permission, 'id' | 'createdAt' | 'updatedAt'>> & {
    deletedAt?: Date;
  };
