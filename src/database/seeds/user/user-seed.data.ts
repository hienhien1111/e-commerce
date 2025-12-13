import { RoleEnum } from '@/domain/enums/role.enum';
import { generateUuidV7 } from '@/utils/uuid-v7';

export const getUserSeedData = () => [
  {
    id: generateUuidV7(),
    email: 'admin@teko.com',
    password: 'Admin@123',
    role: RoleEnum.ADMIN,
    state: 'active',
  },
  {
    id: generateUuidV7(),
    email: 'user@teko.com',
    password: 'User@123',
    role: RoleEnum.USER,
    state: 'active',
  },
];
