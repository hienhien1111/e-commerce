import { SetMetadata } from '@nestjs/common';
import { RequiredPermission } from '../guards/permissions.guard';

export const CHECK_PERMISSIONS_KEY = 'check_permissions';
export const CHECK_ANY_PERMISSIONS_KEY = 'check_any_permissions';

/**
 * Decorator to check if user has required permissions
 * @param permissions - Array of required permissions with action and subject
 * @example
 * @CheckPermissions({ action: PermissionActionEnum.CREATE, subject: PermissionSubjectEnum.USER })
 * @CheckPermissions({ action: PermissionActionEnum.READ, subject: PermissionSubjectEnum.USER }, { action: PermissionActionEnum.UPDATE, subject: PermissionSubjectEnum.USER })
 */
export const CheckPermissions = (...permissions: RequiredPermission[]) =>
  SetMetadata(CHECK_PERMISSIONS_KEY, permissions);

/** Authorize when at least one of the supplied permissions is granted. */
export const CheckAnyPermissions = (...permissions: RequiredPermission[]) =>
  SetMetadata(CHECK_ANY_PERMISSIONS_KEY, permissions);
