import { User } from '../entities/user';
import { generateUuidV7 } from '@/utils/uuid-v7';
import {
  UserCreationStrategy,
  CreateUserWithRoleIdInput,
} from './user-creation.strategy';

export class CreateUserWithRoleIdStrategy
  implements UserCreationStrategy<CreateUserWithRoleIdInput>
{
  execute(input: CreateUserWithRoleIdInput): User {
    return User._create(
      {
        email: input.email,
        password: input.password,
        provider: input.provider,
        socialId: input.socialId,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone ?? null,
        avatarUrl: input.avatarUrl ?? null,
        avatarPublicId: input.avatarPublicId ?? null,
        role: null,
        roleId: input.roleId,
      },
      generateUuidV7(),
    );
  }
}
