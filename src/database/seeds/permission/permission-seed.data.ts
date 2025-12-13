import { PermissionActionEnum } from '@/domain/enums/permission-action.enum';
import { PermissionSubjectEnum } from '@/domain/enums/permission-subject.enum';
import { generateUuidV7 } from '@/utils/uuid-v7';

export const getPermissionSeedData = () => [
  {
    id: generateUuidV7(),
    name: 'manage_users',
    action: PermissionActionEnum.MANAGE,
    subject: PermissionSubjectEnum.USER,
  },
  {
    id: generateUuidV7(),
    name: 'create_user',
    action: PermissionActionEnum.CREATE,
    subject: PermissionSubjectEnum.USER,
  },
  {
    id: generateUuidV7(),
    name: 'read_user',
    action: PermissionActionEnum.READ,
    subject: PermissionSubjectEnum.USER,
  },
  {
    id: generateUuidV7(),
    name: 'update_user',
    action: PermissionActionEnum.UPDATE,
    subject: PermissionSubjectEnum.USER,
  },
  {
    id: generateUuidV7(),
    name: 'delete_user',
    action: PermissionActionEnum.DELETE,
    subject: PermissionSubjectEnum.USER,
  },
  {
    id: generateUuidV7(),
    name: 'manage_roles',
    action: PermissionActionEnum.MANAGE,
    subject: PermissionSubjectEnum.ROLE,
  },
  {
    id: generateUuidV7(),
    name: 'read_role',
    action: PermissionActionEnum.READ,
    subject: PermissionSubjectEnum.ROLE,
  },
  {
    id: generateUuidV7(),
    name: 'manage_permissions',
    action: PermissionActionEnum.MANAGE,
    subject: PermissionSubjectEnum.PERMISSION,
  },
  {
    id: generateUuidV7(),
    name: 'read_permission',
    action: PermissionActionEnum.READ,
    subject: PermissionSubjectEnum.PERMISSION,
  },
];

export const rolePermissionSeedData = {
  admin: [
    'manage_users',
    'create_user',
    'read_user',
    'update_user',
    'delete_user',
    'manage_roles',
    'read_role',
    'manage_permissions',
    'read_permission',
  ],
  user: ['read_user', 'read_role'],
};
