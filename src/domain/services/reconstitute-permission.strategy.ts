import { Permission } from '../entities/permission';
import {
  PermissionCreationStrategy,
  ReconstitutePermissionInput,
} from './permission-creation.strategy';

export class ReconstitutePermissionStrategy
  implements PermissionCreationStrategy<ReconstitutePermissionInput>
{
  execute(input: ReconstitutePermissionInput): Permission {
    return Permission._create(
      {
        name: input.name,
        action: input.action,
        subject: input.subject,
        conditions: input.conditions,
      },
      input.id,
      input.createdAt,
      input.updatedAt,
      input.deletedAt,
    );
  }
}
