import type {
  Role as PrismaRole,
  RolePermission as PrismaRolePermission,
  Permission as PrismaPermission,
} from '@/generated/prisma/client';
import { Role } from '@/domain/entities/role';
import { RoleFactory } from '@/domain/factories/role.factory';
import { PermissionMapper } from '@/infrastructure/persistence/mappers/permission.mapper';

export type PrismaRoleWithRelations = PrismaRole & {
  permissions?: (PrismaRolePermission & { permission: PrismaPermission })[];
};

export class RoleMapper {
  static toDomain(raw: PrismaRoleWithRelations): Role {
    const permissions = raw.permissions
      ? raw.permissions.map((rp) => PermissionMapper.toDomain(rp.permission))
      : null;

    return RoleFactory.reconstitute({
      id: raw.id,
      name: raw.name ?? '',
      permissions,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(domainEntity: Role): {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: domainEntity.id,
      name: domainEntity.name,
      createdAt: domainEntity.createdAt,
      updatedAt: domainEntity.updatedAt,
    };
  }
}
