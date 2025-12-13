import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionEntity } from '../entities/permission.entity';
import { NullableType } from '@/utils/types/nullable.type';
import { DeepPartial } from '@/utils/types/deep-partial.type';
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
import { IPaginationOptions } from '@/utils/types/pagination-options';

@Injectable()
export class TypeOrmPermissionRepository implements PermissionRepositoryPort {
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
  ) {}

  async findManyWithPagination(params: {
    filterOptions?: FilterPermissionDto | null;
    sortOptions?: SortPermissionDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<Permission[]> {
    const { filterOptions, sortOptions, paginationOptions } = params;
    const queryBuilder =
      this.permissionRepository.createQueryBuilder('permission');

    if (filterOptions) {
      if (filterOptions.action) {
        queryBuilder.andWhere('permission.action = :action', {
          action: filterOptions.action,
        });
      }
      if (filterOptions.subject) {
        queryBuilder.andWhere('permission.subject = :subject', {
          subject: filterOptions.subject,
        });
      }
    }

    if (paginationOptions.cursor) {
      queryBuilder.andWhere('permission.id > :cursor', {
        cursor: paginationOptions.cursor,
      });
    }

    if (sortOptions && sortOptions.length > 0) {
      for (const [index, sort] of sortOptions.entries()) {
        if (index === 0) {
          queryBuilder.orderBy(
            `permission.${String(sort.orderBy)}`,
            sort.order.toUpperCase() as 'ASC' | 'DESC',
          );
        } else {
          queryBuilder.addOrderBy(
            `permission.${String(sort.orderBy)}`,
            sort.order.toUpperCase() as 'ASC' | 'DESC',
          );
        }
      }
    } else {
      queryBuilder.orderBy('permission.id', 'ASC');
    }

    const entities = await queryBuilder
      .take(paginationOptions.limit + 1)
      .getMany();

    return entities
      .slice(0, paginationOptions.limit)
      .map((entity) => PermissionMapper.toDomain(entity));
  }

  async findById(id: Permission['id']): Promise<NullableType<Permission>> {
    const entity = await this.permissionRepository.findOne({
      where: { id },
    });

    return entity ? PermissionMapper.toDomain(entity) : null;
  }

  async findAll(): Promise<Permission[]> {
    const entities = await this.permissionRepository.find({
      order: { subject: 'ASC', action: 'ASC' },
    });

    return entities.map((entity) => PermissionMapper.toDomain(entity));
  }

  async findByRoleIds(roleIds: string[]): Promise<Permission[]> {
    const entities = await this.permissionRepository
      .createQueryBuilder('permission')
      .innerJoin('permission.roles', 'role')
      .where('role.id IN (:...roleIds)', { roleIds })
      .getMany();

    return entities.map((entity) => PermissionMapper.toDomain(entity));
  }

  async create(data: CreatePermissionInput): Promise<Permission> {
    const domainEntity = PermissionFactory.create(data);
    const persistenceModel = PermissionMapper.toPersistence(domainEntity);
    const newEntity = await this.permissionRepository.save(
      this.permissionRepository.create(persistenceModel),
    );
    return PermissionMapper.toDomain(newEntity);
  }

  async update(
    id: Permission['id'],
    payload: DeepPartial<
      Omit<Permission, 'id' | 'createdAt' | 'conditions'>
    > & {
      conditions?: Permission['conditions'];
    },
  ): Promise<Permission | null> {
    const entity = await this.permissionRepository.findOne({
      where: { id },
    });

    if (!entity) {
      return null;
    }

    const domainEntity = PermissionMapper.toDomain(entity);

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

    const updatedEntity = await this.permissionRepository.save(
      PermissionMapper.toPersistence(domainEntity),
    );

    return PermissionMapper.toDomain(updatedEntity);
  }

  async remove(id: Permission['id']): Promise<void> {
    await this.permissionRepository.softDelete(id);
  }
}
