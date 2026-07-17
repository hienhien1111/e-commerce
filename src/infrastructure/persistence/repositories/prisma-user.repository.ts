import { Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { UserRepositoryPort } from '@/application/identity/ports/user/user.repository.port';
import { User } from '@/domain/entities/user';
import {
  UserFactory,
  CreateUserWithRoleInput,
  CreateUserWithRoleIdInput,
} from '@/domain/factories/user.factory';
import { UserMapper } from '../mappers/user.mapper';
import { NullableType } from '@/utils/types/nullable.type';
import { IPaginationOptions } from '@/utils/types/pagination-options';
import {
  UserFilterCriteria,
  UserSortCriteria,
} from '@/application/identity/types/user-query.types';
import { DeepPartial } from '@/utils/types/deep-partial.type';

const USER_WITH_ROLES_INCLUDE = {
  roles: {
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  },
} as const satisfies Prisma.UserInclude;

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateUserWithRoleInput | CreateUserWithRoleIdInput,
  ): Promise<User> {
    const isCreateWithRoleId = (
      input: CreateUserWithRoleInput | CreateUserWithRoleIdInput,
    ): input is CreateUserWithRoleIdInput => {
      return 'roleId' in input && !('role' in input);
    };

    const domainEntity = isCreateWithRoleId(data)
      ? UserFactory.createWithRoleId(data)
      : UserFactory.createWithRole(data);

    const persistence = UserMapper.toPersistence(domainEntity);
    const roleId = domainEntity.roleId;

    const created = await this.prisma.user.create({
      data: {
        id: persistence.id,
        email: persistence.email,
        password: persistence.password,
        provider: persistence.provider,
        socialId: persistence.socialId,
        firstName: persistence.firstName,
        lastName: persistence.lastName,
        phone: persistence.phone,
        avatarUrl: persistence.avatarUrl,
        avatarPublicId: persistence.avatarPublicId,
        verifiedAt: persistence.verifiedAt,
        createdAt: persistence.createdAt,
        updatedAt: persistence.updatedAt,
        deletedAt: persistence.deletedAt,
        ...(roleId
          ? {
              roles: {
                create: [{ roleId }],
              },
            }
          : {}),
      },
      include: USER_WITH_ROLES_INCLUDE,
    });

    return UserMapper.toDomain(created);
  }

  async findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: UserFilterCriteria | null;
    sortOptions?: UserSortCriteria[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<User[]> {
    const where: Prisma.UserWhereInput = {};

    if (filterOptions?.roles?.length) {
      where.roles = {
        some: {
          roleId: { in: filterOptions.roles.map((role) => role.id) },
        },
      };
    }

    if (paginationOptions.cursor) {
      where.id = { gt: paginationOptions.cursor };
    }

    const orderBy: Prisma.UserOrderByWithRelationInput[] =
      sortOptions && sortOptions.length > 0
        ? sortOptions.map(
            (sort) =>
              ({
                [String(sort.orderBy)]:
                  sort.order.toLowerCase() === 'desc' ? 'desc' : 'asc',
              }) as Prisma.UserOrderByWithRelationInput,
          )
        : [{ id: 'asc' }];

    const rows = await this.prisma.user.findMany({
      where,
      orderBy,
      take: paginationOptions.limit + 1,
      include: USER_WITH_ROLES_INCLUDE,
    });

    return rows
      .slice(0, paginationOptions.limit)
      .map((row) => UserMapper.toDomain(row));
  }

  async findById(id: User['id']): Promise<NullableType<User>> {
    const row = await this.prisma.user.findUnique({
      where: { id },
      include: USER_WITH_ROLES_INCLUDE,
    });

    return row ? UserMapper.toDomain(row) : null;
  }

  async findByIds(ids: User['id'][]): Promise<User[]> {
    if (ids.length === 0) {
      return [];
    }

    const rows = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      include: USER_WITH_ROLES_INCLUDE,
    });

    return rows.map((row) => UserMapper.toDomain(row));
  }

  async findByEmail(email: User['email']): Promise<NullableType<User>> {
    if (email === null) {
      return null;
    }

    const row = await this.prisma.user.findFirst({
      where: { email },
      include: USER_WITH_ROLES_INCLUDE,
    });

    return row ? UserMapper.toDomain(row) : null;
  }

  async findBySocialIdAndProvider({
    socialId,
    provider,
  }: {
    socialId: User['socialId'];
    provider: User['provider'];
  }): Promise<NullableType<User>> {
    if (socialId === null || socialId === undefined) {
      return null;
    }

    const row = await this.prisma.user.findFirst({
      where: {
        socialId,
        provider: String(provider),
      },
      include: USER_WITH_ROLES_INCLUDE,
    });

    return row ? UserMapper.toDomain(row) : null;
  }

  async update(
    id: User['id'],
    payload: DeepPartial<Omit<User, 'id' | 'createdAt' | 'role'>> & {
      role?: User['role'];
    },
  ): Promise<User | null> {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      include: USER_WITH_ROLES_INCLUDE,
    });

    if (!existing) {
      return null;
    }

    const domainEntity = UserMapper.toDomain(existing);

    if (payload.email !== undefined && payload.email !== null) {
      domainEntity.updateEmail(payload.email);
    }
    if (payload.password !== undefined && payload.password !== null) {
      domainEntity.updatePassword(payload.password);
    }
    if (payload.firstName !== undefined || payload.lastName !== undefined) {
      domainEntity.updateProfile(
        payload.firstName ?? undefined,
        payload.lastName ?? undefined,
      );
    }
    if (payload.phone !== undefined) {
      domainEntity.updateProfile(undefined, undefined, payload.phone);
    }
    if (
      payload.avatarUrl !== undefined ||
      payload.avatarPublicId !== undefined
    ) {
      domainEntity.updateAvatar(
        payload.avatarUrl === undefined
          ? domainEntity.avatarUrl
          : payload.avatarUrl,
        payload.avatarPublicId === undefined
          ? domainEntity.avatarPublicId
          : payload.avatarPublicId,
      );
    }
    if (payload.verifiedAt !== undefined && payload.verifiedAt !== null) {
      domainEntity.confirmEmail();
    }
    if (payload.role !== undefined) {
      if (payload.role === null) {
        domainEntity.clearRole();
      } else {
        domainEntity.assignRole(payload.role);
      }
    }

    const persistence = UserMapper.toPersistence(domainEntity);
    const nextRoleId = domainEntity.roleId;
    const roleChanged = payload.role !== undefined;

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        email: persistence.email,
        password: persistence.password,
        provider: persistence.provider,
        socialId: persistence.socialId,
        firstName: persistence.firstName,
        lastName: persistence.lastName,
        phone: persistence.phone,
        avatarUrl: persistence.avatarUrl,
        avatarPublicId: persistence.avatarPublicId,
        verifiedAt: persistence.verifiedAt,
        updatedAt: persistence.updatedAt,
        deletedAt: persistence.deletedAt,
        ...(roleChanged
          ? {
              roles: {
                deleteMany: {},
                ...(nextRoleId ? { create: [{ roleId: nextRoleId }] } : {}),
              },
            }
          : {}),
      },
      include: USER_WITH_ROLES_INCLUDE,
    });

    return UserMapper.toDomain(updated);
  }

  async remove(id: User['id']): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
