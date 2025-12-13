import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { User } from '@/domain/entities/user';
import { Permission } from '@/domain/entities/permission';
import { PermissionActionEnum } from '@/domain/enums/permission-action.enum';
import { PermissionSubjectEnum } from '@/domain/enums/permission-subject.enum';

type Actions = PermissionActionEnum | string;

type Subjects = PermissionSubjectEnum | string;

export type AppAbility = MongoAbility<[Actions, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: User): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    const permissions: Permission[] = user.role?.permissions || [];

    permissions.forEach((permission) => {
      if (permission.conditions) {
        can(
          permission.action,
          permission.subject,
          permission.conditions as Parameters<typeof can>[2],
        );
      } else {
        can(permission.action, permission.subject);
      }
    });

    return build();
  }
}
