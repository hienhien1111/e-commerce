---
to: src/infrastructure/persistence/repositories/<%= nameKebabCase %>.repository.impl.ts
skip_if: <%= addToInfrastructure ? false : true %>
---
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { <%= name %>Entity } from '../entities/<%= nameKebabCase %>.entity';
import { NullableType } from '@/utils/types/nullable.type';
import { <%= name %> } from '@/domain/entities/<%= nameKebabCase %>';
import { <%= name %>Mapper } from '../mappers/<%= nameKebabCase %>.mapper';
import { IPaginationOptions } from '@/utils/types/pagination-options';
import {
  <%= name %>RepositoryPort,
  Filter<%= name %>Dto,
  Sort<%= name %>Dto,
} from '@/application/<%= moduleName %>/ports/<%= nameKebabCase %>/<%= nameKebabCase %>.repository.port';
import { DeepPartial } from '@/utils/types/deep-partial.type';

@Injectable()
export class <%= name %>RepositoryImpl implements <%= name %>RepositoryPort {
  constructor(
    @InjectRepository(<%= name %>Entity)
    private readonly <%= nameCamelCase %>Repository: Repository<<%= name %>Entity>,
  ) {}

  async findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: Filter<%= name %>Dto | null;
    sortOptions?: Sort<%= name %>Dto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<<%= name %>[]> {
    const queryBuilder =
      this.<%= nameCamelCase %>Repository.createQueryBuilder('<%= nameCamelCase %>');

    if (filterOptions?.name) {
      queryBuilder.andWhere('<%= nameCamelCase %>.name ILIKE :name', {
        name: `%${filterOptions.name}%`,
      });
    }

    if (paginationOptions.cursor) {
      queryBuilder.andWhere('<%= nameCamelCase %>.id > :cursor', {
        cursor: paginationOptions.cursor,
      });
    }

    if (sortOptions && sortOptions.length > 0) {
      for (const [index, sort] of sortOptions.entries()) {
        if (index === 0) {
          queryBuilder.orderBy(
            `<%= nameCamelCase %>.${String(sort.orderBy)}`,
            sort.order.toUpperCase() as 'ASC' | 'DESC',
          );
        } else {
          queryBuilder.addOrderBy(
            `<%= nameCamelCase %>.${String(sort.orderBy)}`,
            sort.order.toUpperCase() as 'ASC' | 'DESC',
          );
        }
      }
    } else {
      queryBuilder.orderBy('<%= nameCamelCase %>.id', 'ASC');
    }

    const entities = await queryBuilder
      .take(paginationOptions.limit + 1)
      .getMany();

    return entities
      .slice(0, paginationOptions.limit)
      .map((entity) => <%= name %>Mapper.toDomain(entity));
  }

  async findById(id: <%= name %>['id']): Promise<NullableType<<%= name %>>> {
    const entity = await this.<%= nameCamelCase %>Repository.findOne({
      where: { id },
    });

    return entity ? <%= name %>Mapper.toDomain(entity) : null;
  }

  async create(data: <%= name %>): Promise<<%= name %>> {
    const persistenceModel = <%= name %>Mapper.toPersistence(data);
    const newEntity = await this.<%= nameCamelCase %>Repository.save(
      this.<%= nameCamelCase %>Repository.create(persistenceModel),
    );
    return <%= name %>Mapper.toDomain(newEntity);
  }

  async update(
    id: <%= name %>['id'],
    payload: DeepPartial<<%= name %>>,
  ): Promise<<%= name %> | null> {
    const entity = await this.<%= nameCamelCase %>Repository.findOne({
      where: { id },
    });

    if (!entity) {
      return null;
    }

    const domainEntity = <%= name %>Mapper.toDomain(entity);
    
    if (payload.name !== undefined) {
      domainEntity.updateName(payload.name as string);
    }

    const updatedEntity = await this.<%= nameCamelCase %>Repository.save(
      this.<%= nameCamelCase %>Repository.create(
        <%= name %>Mapper.toPersistence(domainEntity),
      ),
    );

    return <%= name %>Mapper.toDomain(updatedEntity);
  }

  async remove(id: <%= name %>['id']): Promise<void> {
    await this.<%= nameCamelCase %>Repository.softDelete(id);
  }
}
