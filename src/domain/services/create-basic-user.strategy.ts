import { User } from '../entities/user';
import { generateUuidV7 } from '@/utils/uuid-v7';
import {
  UserCreationStrategy,
  CreateUserInput,
} from './user-creation.strategy';

export class CreateBasicUserStrategy
  implements UserCreationStrategy<CreateUserInput>
{
  execute(input: CreateUserInput): User {
    return User._create(
      {
        ...input,
        phone: input.phone ?? null,
        avatarUrl: input.avatarUrl ?? null,
        avatarPublicId: input.avatarPublicId ?? null,
        roleId: input.role ? input.role.id : null,
      },
      generateUuidV7(),
    );
  }
}
