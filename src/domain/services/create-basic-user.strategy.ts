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
    const role = input.role ?? null;
    return User._create(
      {
        ...input,
        role: role,
        roleId: role?.id ?? null,
      },
      generateUuidV7(),
    );
  }
}
