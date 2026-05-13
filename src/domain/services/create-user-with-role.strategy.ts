import { User } from '../entities/user';
import { generateUuidV7 } from '@/utils/uuid-v7';
import {
  UserCreationStrategy,
  CreateUserWithRoleInput,
} from './user-creation.strategy';

export class CreateUserWithRoleStrategy
  implements UserCreationStrategy<CreateUserWithRoleInput>
{
  execute(input: CreateUserWithRoleInput): User {
    return User._create(
      {
        email: input.email,
        password: input.password,
        provider: input.provider,
        socialId: input.socialId,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        roleId: input.role ? input.role.id : null,
      },
      generateUuidV7(),
    );
  }
}
