import type { Permission as PrismaPermission } from '@/generated/prisma/client';
import { Permission } from '@/domain/entities/permission';
import { PermissionFactory } from '@/domain/factories/permission.factory';
import { PermissionActionEnum } from '@/domain/enums/permission-action.enum';
import { PermissionSubjectEnum } from '@/domain/enums/permission-subject.enum';
import type { CaslConditions } from '@/domain/types/casl-conditions.type';

/**
 * Permission rows fetched via Prisma. `conditions` is typed as
 * `runtime.JsonValue | null` upstream; we narrow it to our domain shape
 * at this boundary.
 */
type PrismaPermissionLike = Omit<PrismaPermission, 'conditions'> & {
  conditions: unknown;
};

function toEnumValue<E extends Record<string, string>>(
  raw: string,
  enumObj: E,
  field: string,
): E[keyof E] {
  const values = Object.values(enumObj) as string[];
  if (!values.includes(raw)) {
    throw new Error(
      `Invalid permission ${field} from DB: "${raw}" not in [${values.join(', ')}]`,
    );
  }
  return raw as E[keyof E];
}

export class PermissionMapper {
  static toDomain(raw: PrismaPermissionLike): Permission {
    return PermissionFactory.reconstitute({
      id: raw.id,
      name: raw.name,
      action: toEnumValue(raw.action, PermissionActionEnum, 'action'),
      subject: toEnumValue(raw.subject, PermissionSubjectEnum, 'subject'),
      conditions: (raw.conditions ?? null) as CaslConditions | null,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
    });
  }

  /**
   * Returns a plain object suitable for `prisma.permission.create({ data })`
   * or `prisma.permission.update({ data })`. We intentionally avoid coupling
   * to Prisma's generated input types here — repositories cast as needed.
   */
  static toPersistence(domainEntity: Permission): {
    id: string;
    name: string;
    action: PermissionActionEnum;
    subject: PermissionSubjectEnum;
    conditions: unknown;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  } {
    return {
      id: domainEntity.id,
      name: domainEntity.name,
      action: domainEntity.action,
      subject: domainEntity.subject,
      conditions: domainEntity.conditions,
      createdAt: domainEntity.createdAt,
      updatedAt: domainEntity.updatedAt,
      deletedAt: domainEntity.deletedAt,
    };
  }
}
