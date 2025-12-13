import { Permission } from '../entities/permission';
import {
  PermissionCreationStrategy,
  CreatePermissionInput,
  ReconstitutePermissionInput,
} from '../services/permission-creation.strategy';
import { CreateBasicPermissionStrategy } from '../services/create-basic-permission.strategy';
import { ReconstitutePermissionStrategy } from '../services/reconstitute-permission.strategy';

export type { CreatePermissionInput, ReconstitutePermissionInput };

type PermissionCreationInput =
  | CreatePermissionInput
  | ReconstitutePermissionInput;

export class PermissionFactory {
  private static strategies: Record<
    string,
    PermissionCreationStrategy<PermissionCreationInput>
  > = {
    BASIC: new CreateBasicPermissionStrategy(),
    RECONSTITUTE: new ReconstitutePermissionStrategy(),
  };

  static create(input: CreatePermissionInput): Permission {
    return PermissionFactory.strategies.BASIC.execute(input);
  }

  static reconstitute(input: ReconstitutePermissionInput): Permission {
    return PermissionFactory.strategies.RECONSTITUTE.execute(input);
  }
}
