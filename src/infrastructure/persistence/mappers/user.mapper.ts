import type {
  User as PrismaUser,
  UserRole as PrismaUserRole,
  Role as PrismaRole,
  RolePermission as PrismaRolePermission,
  Permission as PrismaPermission,
} from '@/generated/prisma/client';
import { UserFactory } from '@/domain/factories/user.factory';
import { User } from '@/domain/entities/user';
import { AuthProvidersEnum } from '@/domain/enums/auth-providers.enum';
import { RoleMapper } from '@/infrastructure/persistence/mappers/role.mapper';

type PrismaRoleWithPermissions = PrismaRole & {
  permissions?: (PrismaRolePermission & { permission: PrismaPermission })[];
};

type PrismaUserRoleWithRole = PrismaUserRole & {
  role: PrismaRoleWithPermissions;
};

export type PrismaUserWithRelations = PrismaUser & {
  roles?: PrismaUserRoleWithRole[];
};

export class UserMapper {
  static toDomain(raw: PrismaUserWithRelations): User {
    const firstUserRole =
      raw.roles && raw.roles.length > 0 ? raw.roles[0] : undefined;
    const firstRole = firstUserRole?.role;

    return UserFactory.reconstitute({
      id: raw.id,
      email: raw.email,
      password: raw.password,
      provider: raw.provider || AuthProvidersEnum.EMAIL,
      socialId: raw.socialId,
      firstName: raw.firstName,
      lastName: raw.lastName,
      phone: raw.phone,
      avatarUrl: raw.avatarUrl,
      avatarPublicId: raw.avatarPublicId,
      verifiedAt: raw.verifiedAt,
      role: firstRole ? RoleMapper.toDomain(firstRole) : null,
      roleId: firstRole ? firstRole.id : null,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
    });
  }

  /**
   * Returns scalar columns suitable for `prisma.user.create({ data })` /
   * `prisma.user.update({ data })`. The `roles` join table is managed
   * separately by the repository (nested writes on `roles`).
   */
  static toPersistence(domainEntity: User): {
    id: string;
    email: string | null;
    password: string | null;
    provider: string;
    socialId: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    avatarUrl: string | null;
    avatarPublicId: string | null;
    verifiedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  } {
    return {
      id: domainEntity.id,
      email: domainEntity.email,
      password: domainEntity.password,
      provider: String(domainEntity.provider),
      socialId: domainEntity.socialId,
      firstName: domainEntity.firstName,
      lastName: domainEntity.lastName,
      phone: domainEntity.phone,
      avatarUrl: domainEntity.avatarUrl,
      avatarPublicId: domainEntity.avatarPublicId,
      verifiedAt: domainEntity.verifiedAt,
      createdAt: domainEntity.createdAt,
      updatedAt: domainEntity.updatedAt,
      deletedAt: domainEntity.deletedAt,
    };
  }
}
