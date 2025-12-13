import { User } from '../entities/user';
import {
  UserCreationStrategy,
  ReconstituteUserInput,
} from './user-creation.strategy';

export class ReconstituteUserStrategy
  implements UserCreationStrategy<ReconstituteUserInput>
{
  execute(input: ReconstituteUserInput): User {
    return User._create(
      {
        email: input.email,
        password: input.password,
        provider: input.provider,
        socialId: input.socialId,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        roleId: input.roleId ?? input.role?.id ?? null,
      },
      input.id,
      input.createdAt,
      input.updatedAt,
      input.deletedAt,
      false,
    );
  }
}
