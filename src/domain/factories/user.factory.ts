import { User } from '../entities/user';
import { UserCreationType } from './user-creation-type.enum';
import {
  UserCreationStrategy,
  CreateUserInput,
  CreateUserWithRoleInput,
  CreateUserWithRoleIdInput,
  ReconstituteUserInput,
} from '../services/user-creation.strategy';
import { CreateBasicUserStrategy } from '../services/create-basic-user.strategy';
import { CreateUserWithRoleStrategy } from '../services/create-user-with-role.strategy';
import { CreateUserWithRoleIdStrategy } from '../services/create-user-with-role-id.strategy';
import { ReconstituteUserStrategy } from '../services/reconstitute-user.strategy';

export type {
  CreateUserInput,
  CreateUserWithRoleInput,
  CreateUserWithRoleIdInput,
  ReconstituteUserInput,
};

type UserCreationInput =
  | CreateUserInput
  | CreateUserWithRoleInput
  | CreateUserWithRoleIdInput
  | ReconstituteUserInput;

export class UserFactory {
  private static strategies: Record<
    UserCreationType,
    UserCreationStrategy<UserCreationInput>
  > = {
    [UserCreationType.BASIC]: new CreateBasicUserStrategy(),
    [UserCreationType.WITH_ROLE]: new CreateUserWithRoleStrategy(),
    [UserCreationType.WITH_ROLE_ID]: new CreateUserWithRoleIdStrategy(),
    [UserCreationType.RECONSTITUTE]: new ReconstituteUserStrategy(),
  };

  private static getStrategy(
    type: UserCreationType,
  ): UserCreationStrategy<UserCreationInput> {
    const strategy = this.strategies[type];
    if (!strategy) {
      throw new Error(`User creation strategy not found for type: ${type}`);
    }
    return strategy;
  }

  static create(input: CreateUserInput): User {
    return this.strategies[UserCreationType.BASIC].execute(input);
  }

  static createWithRole(input: CreateUserWithRoleInput): User {
    return this.strategies[UserCreationType.WITH_ROLE].execute(input);
  }

  static createWithRoleId(input: CreateUserWithRoleIdInput): User {
    return this.strategies[UserCreationType.WITH_ROLE_ID].execute(input);
  }

  static reconstitute(input: ReconstituteUserInput): User {
    return this.strategies[UserCreationType.RECONSTITUTE].execute(input);
  }

  static createByType(
    type: UserCreationType.BASIC,
    input: CreateUserInput,
  ): User;
  static createByType(
    type: UserCreationType.WITH_ROLE,
    input: CreateUserWithRoleInput,
  ): User;
  static createByType(
    type: UserCreationType.WITH_ROLE_ID,
    input: CreateUserWithRoleIdInput,
  ): User;
  static createByType(
    type: UserCreationType.RECONSTITUTE,
    input: ReconstituteUserInput,
  ): User;
  static createByType(
    type: UserCreationType,
    input:
      | CreateUserInput
      | CreateUserWithRoleInput
      | CreateUserWithRoleIdInput
      | ReconstituteUserInput,
  ): User {
    return this.getStrategy(type).execute(input);
  }

  static registerStrategy(
    type: UserCreationType,
    strategy: UserCreationStrategy<UserCreationInput>,
  ): void {
    this.strategies[type] = strategy;
  }
}
