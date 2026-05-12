import { Injectable } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Permission } from '@/domain/entities/permission';
import {
  PermissionFactory,
  CreatePermissionInput,
} from '@/domain/factories/permission.factory';
import { PermissionMapper } from '../mappers/permission.mapper';
import {
  FilterPermissionDto,
  PermissionRepositoryPort,
  SortPermissionDto,
} from '@/application/authorization/ports/permission.repository.port';
import { NullableType } from '@/utils/types/nullable.type';
import { DeepPartial } from '@/utils/types/deep-partial.type';
import { IPaginationOptions } from '@/utils/types/pagination-options';

@Injectable()
export class PrismaPermissionRepository implements PermissionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findManyWithPagination(params: {
    filterOptions?: FilterPermissionDto | null;
    sortOptions?: SortPermissionDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<Permission[]> {
    const { filterOptions, sortOptions, paginationOptions } = params;

    const where: Prisma.PermissionWhereInput = {};
    if (filterOptions?.action) {
      where.action = filterOptions.action;
    }
    if (filterOptions?.subject) {
      where.subject = filterOptions.subject;
    }
    if (paginationOptions.cursor) {
      where.id = { gt: paginationOptions.cursor };
    }

    const orderBy: Prisma.PermissionOrderByWithRelationInput[] =
      sortOptions && sortOptions.length > 0
        ? sortOptions.map(
            (sort) =>
              ({
                [String(sort.orderBy)]:
                  sort.order.toLowerCase() === 'desc' ? 'desc' : 'asc',
              }) as Prisma.PermissionOrderByWithRelationInput,
          )
        : [{ id: 'asc' }];

    const rows = await this.prisma.permission.findMany({
      where,
      orderBy,
      take: paginationOptions.limit + 1,
    });

    return rows
      .slice(0, paginationOptions.limit)
      .map((row) => PermissionMapper.toDomain(row));
  }

  async findById(id: Permission['id']): Promise<NullableType<Permission>> {
    const row = await this.prisma.permission.findUnique({
      where: { id },
    });

    return row ? PermissionMapper.toDomain(row) : null;
  }

  async findAll(): Promise<Permission[]> {
    const rows = await this.prisma.permission.findMany({
      orderBy: [{ subject: 'asc' }, { action: 'asc' }],
    });

    return rows.map((row) => PermissionMapper.toDomain(row));
  }

  async findByRoleIds(roleIds: string[]): Promise<Permission[]> {
    if (roleIds.length === 0) {
      return [];
    }

    const rows = await this.prisma.permission.findMany({
      where: {
        roles: {
          some: { roleId: { in: roleIds } },
        },
      },
    });

    return rows.map((row) => PermissionMapper.toDomain(row));
  }

  async create(data: CreatePermissionInput): Promise<Permission> {
    const domainEntity = PermissionFactory.create(data);
    const persistence = PermissionMapper.toPersistence(domainEntity);

    const created = await this.prisma.permission.create({
      data: {
        id: persistence.id,
        name: persistence.name,
        action: persistence.action,
        subject: persistence.subject,
        conditions: persistence.conditions as Prisma.InputJsonValue | undefined,
        createdAt: persistence.createdAt,
        updatedAt: persistence.updatedAt,
        deletedAt: persistence.deletedAt,
      },
    });

    return PermissionMapper.toDomain(created);
  }

  async update(
    id: Permission['id'],
    payload: DeepPartial<
      Omit<Permission, 'id' | 'createdAt' | 'conditions'>
    > & {
      conditions?: Permission['conditions'];
    },
  ): Promise<Permission | null> {
    const existing = await this.prisma.permission.findUnique({ where: { id } });

    if (!existing) {
      return null;
    }

    const domainEntity = PermissionMapper.toDomain(existing);

    if (payload.name !== undefined) {
      domainEntity.updateName(payload.name);
    }
    if (payload.action !== undefined) {
      domainEntity.updateAction(payload.action);
    }
    if (payload.subject !== undefined) {
      domainEntity.updateSubject(payload.subject);
    }
    if (payload.conditions !== undefined) {
      domainEntity.updateConditions(payload.conditions);
    }

    const persistence = PermissionMapper.toPersistence(domainEntity);

    const updated = await this.prisma.permission.update({
      where: { id },
      data: {
        name: persistence.name,
        action: persistence.action,
        subject: persistence.subject,
        conditions:
          persistence.conditions === null
            ? Prisma.JsonNull
            : (persistence.conditions as Prisma.InputJsonValue),
        updatedAt: persistence.updatedAt,
        deletedAt: persistence.deletedAt,
      },
    });

    return PermissionMapper.toDomain(updated);
  }

  async remove(id: Permission['id']): Promise<void> {
    await this.prisma.permission.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
