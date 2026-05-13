import { Role } from '../entities/role';
import {
  RoleCreationStrategy,
  ReconstituteRoleInput,
} from './role-creation.strategy';

export class ReconstituteRoleStrategy
  implements RoleCreationStrategy<ReconstituteRoleInput>
{
  execute(input: ReconstituteRoleInput): Role {
    return Role._create(
      {
        name: input.name,
        permissions: input.permissions,
      },
      input.id,
      input.createdAt,
      input.updatedAt,
    );
  }
}
