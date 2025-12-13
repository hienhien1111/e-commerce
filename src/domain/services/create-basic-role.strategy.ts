import { Role } from '../entities/role';
import { generateUuidV7 } from '@/utils/uuid-v7';
import {
  RoleCreationStrategy,
  CreateRoleInput,
} from './role-creation.strategy';

export class CreateBasicRoleStrategy
  implements RoleCreationStrategy<CreateRoleInput>
{
  execute(input: CreateRoleInput): Role {
    return Role._create(
      {
        name: input.name,
        permissions: input.permissions ?? null,
      },
      generateUuidV7(),
    );
  }
}
