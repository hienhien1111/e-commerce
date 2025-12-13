import { RoleEntity } from '@/infrastructure/persistence/entities/role.entity';
import { RoleMapper } from '@/infrastructure/persistence/mappers/role.mapper';
import { UserFactory } from '@/domain/factories/user.factory';
import { User } from '@/domain/entities/user';
import { UserEntity } from '../entities/user.entity';
import { AuthProvidersEnum } from '@/domain/enums/auth-providers.enum';

export class UserMapper {
  static toDomain(raw: UserEntity): User {
    const firstRole =
      raw.roles && raw.roles.length > 0 ? raw.roles[0] : undefined;
    return UserFactory.reconstitute({
      id: raw.id,
      email: raw.email,
      password: raw.password,
      provider: raw.provider || AuthProvidersEnum.EMAIL,
      socialId: raw.socialId ?? null,
      firstName: raw.firstName,
      lastName: raw.lastName,
      role: firstRole ? RoleMapper.toDomain(firstRole) : null,
      roleId: firstRole ? firstRole.id : null,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt ?? undefined,
    });
  }

  static toPersistence(domainEntity: User): UserEntity {
    const roles: RoleEntity[] = [];
    if (domainEntity.role) {
      roles.push(RoleMapper.toPersistence(domainEntity.role));
    }

    const persistenceEntity = new UserEntity();
    persistenceEntity.id = domainEntity.id;
    persistenceEntity.email = domainEntity.email;
    persistenceEntity.password = domainEntity.password;
    persistenceEntity.provider = domainEntity.provider;
    persistenceEntity.socialId = domainEntity.socialId ?? null;
    persistenceEntity.firstName = domainEntity.firstName ?? null;
    persistenceEntity.lastName = domainEntity.lastName ?? null;
    persistenceEntity.roles = roles;
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;
    persistenceEntity.deletedAt = domainEntity.deletedAt ?? null;
    return persistenceEntity;
  }
}
