import { Role } from '../entities/role';
import {
  RoleCreationStrategy,
  CreateRoleInput,
  ReconstituteRoleInput,
} from '../services/role-creation.strategy';
import { CreateBasicRoleStrategy } from '../services/create-basic-role.strategy';
import { ReconstituteRoleStrategy } from '../services/reconstitute-role.strategy';

export type { CreateRoleInput, ReconstituteRoleInput };

type RoleCreationInput = CreateRoleInput | ReconstituteRoleInput;

export class RoleFactory {
  private static strategies: Record<
    string,
    RoleCreationStrategy<RoleCreationInput>
  > = {
    BASIC: new CreateBasicRoleStrategy(),
    RECONSTITUTE: new ReconstituteRoleStrategy(),
  };

  static create(input: CreateRoleInput): Role {
    return RoleFactory.strategies.BASIC.execute(input);
  }

  static reconstitute(input: ReconstituteRoleInput): Role {
    return RoleFactory.strategies.RECONSTITUTE.execute(input);
  }
}
