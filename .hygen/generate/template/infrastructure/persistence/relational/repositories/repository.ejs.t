---
to: src/infrastructure/persistence/repositories/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.repository.impl.ts
---
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { <%= name %>Entity } from '../entities/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.entity';
import { NullableType } from '@/utils/types/nullable.type';
import { <%= name %> } from '@/domain/entities/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>';
import { <%= name %>Mapper } from '../mappers/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.mapper';
import { IPaginationOptions } from '@/utils/types/pagination-options';
import {
  <%= name %>RepositoryPort,
  Filter<%= name %>Dto,
  Sort<%= name %>Dto,
} from '@/application/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>/ports/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.repository.port';
import { DeepPartial } from '@/utils/types/deep-partial.type';

@Injectable()
export class <%= name %>RepositoryImpl implements <%= name %>RepositoryPort {
  constructor(
    @InjectRepository(<%= name %>Entity)
    private readonly <%= h.inflection.camelize(name, true) %>Repository: Repository<<%= name %>Entity>,
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
      this.<%= h.inflection.camelize(name, true) %>Repository.createQueryBuilder('<%= h.inflection.camelize(name, true) %>');

    if (filterOptions?.name) {
      queryBuilder.andWhere('<%= h.inflection.camelize(name, true) %>.name ILIKE :name', {
        name: `%${filterOptions.name}%`,
      });
    }

    if (paginationOptions.cursor) {
      queryBuilder.andWhere('<%= h.inflection.camelize(name, true) %>.id > :cursor', {
        cursor: paginationOptions.cursor,
      });
    }

    if (sortOptions && sortOptions.length > 0) {
      for (const [index, sort] of sortOptions.entries()) {
        if (index === 0) {
          queryBuilder.orderBy(
            `<%= h.inflection.camelize(name, true) %>.${String(sort.orderBy)}`,
            sort.order.toUpperCase() as 'ASC' | 'DESC',
          );
        } else {
          queryBuilder.addOrderBy(
            `<%= h.inflection.camelize(name, true) %>.${String(sort.orderBy)}`,
            sort.order.toUpperCase() as 'ASC' | 'DESC',
          );
        }
      }
    } else {
      queryBuilder.orderBy('<%= h.inflection.camelize(name, true) %>.id', 'ASC');
    }

    const entities = await queryBuilder
      .take(paginationOptions.limit + 1)
      .getMany();

    return entities
      .slice(0, paginationOptions.limit)
      .map((entity) => <%= name %>Mapper.toDomain(entity));
  }

  async findById(id: <%= name %>['id']): Promise<NullableType<<%= name %>>> {
    const entity = await this.<%= h.inflection.camelize(name, true) %>Repository.findOne({
      where: { id },
    });

    return entity ? <%= name %>Mapper.toDomain(entity) : null;
  }

  async create(data: <%= name %>): Promise<<%= name %>> {
    const persistenceModel = <%= name %>Mapper.toPersistence(data);
    const newEntity = await this.<%= h.inflection.camelize(name, true) %>Repository.save(
      this.<%= h.inflection.camelize(name, true) %>Repository.create(persistenceModel),
    );
    return <%= name %>Mapper.toDomain(newEntity);
  }

  async update(
    id: <%= name %>['id'],
    payload: DeepPartial<<%= name %>>,
  ): Promise<<%= name %> | null> {
    const entity = await this.<%= h.inflection.camelize(name, true) %>Repository.findOne({
      where: { id },
    });

    if (!entity) {
      return null;
    }

    const domainEntity = <%= name %>Mapper.toDomain(entity);
    
    if (payload.name !== undefined) {
      domainEntity.updateName(payload.name as string);
    }

    const updatedEntity = await this.<%= h.inflection.camelize(name, true) %>Repository.save(
      this.<%= h.inflection.camelize(name, true) %>Repository.create(
        <%= name %>Mapper.toPersistence(domainEntity),
      ),
    );

    return <%= name %>Mapper.toDomain(updatedEntity);
  }

  async remove(id: <%= name %>['id']): Promise<void> {
    await this.<%= h.inflection.camelize(name, true) %>Repository.softDelete(id);
  }
}
