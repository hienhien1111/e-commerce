import { Role } from '@/domain/entities/role';
import { NullableType } from '@/utils/types/nullable.type';

export interface RoleRepositoryPort {
  findById(id: Role['id']): Promise<NullableType<Role>>;
  findByName(name: NonNullable<Role['name']>): Promise<NullableType<Role>>;
  findAll(): Promise<Role[]>;
}
