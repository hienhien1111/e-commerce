---
to: src/infrastructure/persistence/mappers/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.mapper.ts
---
import { <%= name %>Factory } from '@/domain/factories/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.factory';
import { <%= name %> } from '@/domain/entities/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>';
import { <%= name %>Entity } from '../entities/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.entity';

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
