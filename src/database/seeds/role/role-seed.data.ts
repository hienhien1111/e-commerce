import { RoleEnum } from '@/domain/enums/role.enum';
import { generateUuidV7 } from '@/utils/uuid-v7';

export const getRoleSeedData = () => [
  {
    id: generateUuidV7(),
    name: RoleEnum.ADMIN,
  },
  {
    id: generateUuidV7(),
    name: RoleEnum.USER,
  },
];
