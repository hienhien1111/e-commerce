---
to: src/infrastructure/persistence/mappers/<%= nameKebabCase %>.mapper.ts
skip_if: <%= addToInfrastructure ? false : true %>
---
import { <%= name %>Factory } from '@/domain/factories/<%= nameKebabCase %>.factory';
import { <%= name %> } from '@/domain/entities/<%= nameKebabCase %>';
import { <%= name %>Entity } from '../entities/<%= nameKebabCase %>.entity';

export class <%= name %>Mapper {
  static toDomain(raw: <%= name %>Entity): <%= name %> {
    return <%= name %>Factory.reconstitute({
      id: raw.id,
      name: raw.name,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(domainEntity: <%= name %>): <%= name %>Entity {
    const persistenceEntity = new <%= name %>Entity();
    persistenceEntity.id = domainEntity.id;
    persistenceEntity.name = domainEntity.name;
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
