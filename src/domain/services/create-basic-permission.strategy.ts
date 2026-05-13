import { Permission } from '../entities/permission';
import { generateUuidV7 } from '@/utils/uuid-v7';
import {
  PermissionCreationStrategy,
  CreatePermissionInput,
} from './permission-creation.strategy';

export class CreateBasicPermissionStrategy
  implements PermissionCreationStrategy<CreatePermissionInput>
{
  execute(input: CreatePermissionInput): Permission {
    return Permission._create(
      {
        name: input.name,
        action: input.action,
        subject: input.subject,
        conditions: input.conditions,
      },
      generateUuidV7(),
    );
  }
}
