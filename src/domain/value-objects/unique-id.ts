import { ValueObject } from '@/shared/domain/value-object';

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

interface UniqueIdProps {
  value: string;
}

/**
 * UniqueId — typed wrapper around UUID strings.
 *
 * Provides type safety at function signatures (`UserId` vs `RoleId` at
 * compile time) and a single validation point for ID shape.
 *
 * Subclass for context-specific IDs:
 *   export class UserId extends UniqueId {}
 */
export abstract class UniqueId extends ValueObject<UniqueIdProps> {
  protected constructor(value: string) {
    super({ value });
  }

  protected static validate(raw: string): string {
    if (typeof raw !== 'string') {
      throw new Error('UniqueId must be a string');
    }
    if (!UUID_REGEX.test(raw)) {
      throw new Error(`Invalid UUID: ${raw}`);
    }
    return raw;
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
