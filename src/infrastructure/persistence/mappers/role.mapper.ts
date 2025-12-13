import { RoleEntity } from '../entities/role.entity';
import { RoleFactory } from '@/domain/factories/role.factory';
import { Role } from '@/domain/entities/role';
import { PermissionMapper } from '@/infrastructure/persistence/mappers/permission.mapper';

export class RoleMapper {
  static toDomain(raw: RoleEntity): Role {
    const permissions = raw.permissions?.map((p) =>
      PermissionMapper.toDomain(p),
    );

    const now = new Date();

    return RoleFactory.reconstitute({
      id: raw.id,
      name: raw.name ?? '',
      permissions: permissions ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static toPersistence(domainEntity: Role): RoleEntity {
    const persistenceEntity = new RoleEntity();
    persistenceEntity.id = domainEntity.id;
    persistenceEntity.name = domainEntity.name;
    return persistenceEntity;
  }
}
