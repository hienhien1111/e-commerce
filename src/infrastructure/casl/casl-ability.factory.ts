import { AbilityBuilder } from '@casl/ability';
import { createPrismaAbility, PrismaAbility, Subjects } from '@casl/prisma';
import { Injectable } from '@nestjs/common';
import type {
  User as PrismaUser,
  Role as PrismaRole,
  Permission as PrismaPermission,
} from '@/generated/prisma/client';
import { User } from '@/domain/entities/user';
import { Permission } from '@/domain/entities/permission';
import { PermissionActionEnum } from '@/domain/enums/permission-action.enum';
import { PermissionSubjectEnum } from '@/domain/enums/permission-subject.enum';

/**
 * AppSubjects — discriminated union of all CASL subjects.
 *
 * Includes the string 'all' wildcard plus typed shapes derived from Prisma
 * models (lets `accessibleBy(ability).ofType('User')` return a Prisma
 * `WhereInput` for SQL-level filtering).
 */
export type AppSubjects =
  | 'all'
  | Subjects<{
      User: PrismaUser;
      Role: PrismaRole;
      Permission: PrismaPermission;
    }>;

export type Actions = PermissionActionEnum | string;
export type AppAbility = PrismaAbility<[Actions, AppSubjects]>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: User): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);

    const permissions: Permission[] = user.role?.permissions || [];

    permissions.forEach((permission) => {
      const action = permission.action as Actions;
      const subject = permission.subject as Extract<AppSubjects, string>;

      if (permission.conditions) {
        // Conditions are stored as JSON in DB; treat as Prisma WhereInput at
        // the CASL boundary. Caller is responsible for shape (validated at
        // permission-creation time, not here).
        can(
          action,
          subject,
          permission.conditions as Parameters<typeof can>[2],
        );
      } else {
        can(action, subject);
      }
    });

    return build();
  }
}

// Re-export for callers using the legacy name.
export { PermissionSubjectEnum };
