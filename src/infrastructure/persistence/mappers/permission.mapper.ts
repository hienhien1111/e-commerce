import { PermissionFactory } from '@/domain/factories/permission.factory';
import { Permission } from '@/domain/entities/permission';
import { PermissionEntity } from '../entities/permission.entity';

export class PermissionMapper {
  static toDomain(raw: PermissionEntity): Permission {
    return PermissionFactory.reconstitute({
      id: raw.id,
      name: raw.name,
      action: raw.action,
      subject: raw.subject,
      conditions: raw.conditions ?? null,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt ?? undefined,
    });
  }

  static toPersistence(domainEntity: Permission): PermissionEntity {
    const persistenceEntity = new PermissionEntity();
    persistenceEntity.id = domainEntity.id;
    persistenceEntity.name = domainEntity.name;
    persistenceEntity.action = domainEntity.action;
    persistenceEntity.subject = domainEntity.subject;
    persistenceEntity.conditions = domainEntity.conditions ?? null;
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;
    persistenceEntity.deletedAt = domainEntity.deletedAt ?? null;

    return persistenceEntity;
  }
}
