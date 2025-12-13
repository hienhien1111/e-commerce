import { NullableType } from '@/utils/types/nullable.type';
import { Permission } from '@/domain/entities/permission';
import { CreatePermissionInput } from '@/domain/factories/permission.factory';
import { DeepPartial } from '@/utils/types/deep-partial.type';
import { IPaginationOptions } from '@/utils/types/pagination-options';

export type FilterPermissionDto = Partial<
  Pick<Permission, 'action' | 'subject'>
>;

export type SortPermissionDto = {
  orderBy: keyof Permission;
  order: 'ASC' | 'DESC';
};

export interface PermissionRepositoryPort {
  findManyWithPagination(params: {
    filterOptions?: FilterPermissionDto | null;
    sortOptions?: SortPermissionDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<Permission[]>;

  findById(id: Permission['id']): Promise<NullableType<Permission>>;

  findAll(): Promise<Permission[]>;

  findByRoleIds(roleIds: string[]): Promise<Permission[]>;

  create(data: CreatePermissionInput): Promise<Permission>;

  update(
    id: Permission['id'],
    payload: DeepPartial<
      Omit<Permission, 'id' | 'createdAt' | 'conditions'>
    > & {
      conditions?: Permission['conditions'];
    },
  ): Promise<Permission | null>;

  remove(id: Permission['id']): Promise<void>;
}
