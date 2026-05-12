import { Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { RoleRepositoryPort } from '@/application/authorization/ports/role.repository.port';
import { Role } from '@/domain/entities/role';
import { RoleMapper } from '../mappers/role.mapper';
import { NullableType } from '@/utils/types/nullable.type';

const ROLE_WITH_PERMISSIONS_INCLUDE = {
  permissions: {
    include: { permission: true },
  },
} as const satisfies Prisma.RoleInclude;

@Injectable()
export class PrismaRoleRepository implements RoleRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: Role['id']): Promise<NullableType<Role>> {
    const row = await this.prisma.role.findUnique({
      where: { id },
      include: ROLE_WITH_PERMISSIONS_INCLUDE,
    });

    return row ? RoleMapper.toDomain(row) : null;
  }

  async findByName(
    name: NonNullable<Role['name']>,
  ): Promise<NullableType<Role>> {
    const row = await this.prisma.role.findFirst({
      where: { name },
      include: ROLE_WITH_PERMISSIONS_INCLUDE,
    });

    return row ? RoleMapper.toDomain(row) : null;
  }

  async findAll(): Promise<Role[]> {
    const rows = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: ROLE_WITH_PERMISSIONS_INCLUDE,
    });

    return rows.map((row) => RoleMapper.toDomain(row));
  }
}
