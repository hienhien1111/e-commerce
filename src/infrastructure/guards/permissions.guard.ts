import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory, AppSubjects } from '../casl/casl-ability.factory';
import {
  CHECK_ANY_PERMISSIONS_KEY,
  CHECK_PERMISSIONS_KEY,
} from '../decorators/check-permissions.decorator';
import { User } from '@/domain/entities/user';
import { PermissionActionEnum } from '@/domain/enums/permission-action.enum';
import { PermissionSubjectEnum } from '@/domain/enums/permission-subject.enum';

export interface RequiredPermission {
  action: PermissionActionEnum | string;
  subject: PermissionSubjectEnum | string;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<
      RequiredPermission[]
    >(CHECK_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
    const anyPermissions = this.reflector.getAllAndOverride<
      RequiredPermission[]
    >(CHECK_ANY_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    // If no permissions are required, allow access
    if (
      (!requiredPermissions || requiredPermissions.length === 0) &&
      (!anyPermissions || anyPermissions.length === 0)
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const ability = this.caslAbilityFactory.createForUser(user);

    // Check if user has all required permissions
    const can = (permission: RequiredPermission) =>
      ability.can(
        permission.action,
        permission.subject as Extract<AppSubjects, string>,
      );
    const hasPermission =
      (requiredPermissions?.every(can) ?? true) &&
      (anyPermissions?.some(can) ?? true);

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    return true;
  }
}
