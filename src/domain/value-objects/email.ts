import { ValueObject } from '@/shared/domain/value-object';

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

interface EmailProps {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  private constructor(value: string) {
    super({ value });
  }

  static create(raw: string): Email {
    if (typeof raw !== 'string') {
      throw new Error('Email must be a string');
    }
    const normalized = raw.trim().toLowerCase();
    if (normalized.length === 0) {
      throw new Error('Email cannot be empty');
    }
    if (normalized.length > 254) {
      throw new Error('Email cannot exceed 254 characters (RFC 5321)');
    }
    if (!EMAIL_REGEX.test(normalized)) {
      throw new Error(`Invalid email format: ${raw}`);
    }
    return new Email(normalized);
  }

  get value(): string {
    return this.props.value;
  }

  /** Local part (before @). */
  get localPart(): string {
    return this.props.value.split('@')[0];
  }

  /** Domain part (after @). */
  get domain(): string {
    return this.props.value.split('@')[1];
  }

  toString(): string {
    return this.props.value;
  }
}
