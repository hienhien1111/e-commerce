import { BaseDomainModel } from '@/shared/domain/base-domain-model';
import type { CaslConditions } from '../types/casl-conditions.type';
import { PermissionActionEnum } from '../enums/permission-action.enum';
import { PermissionSubjectEnum } from '../enums/permission-subject.enum';

export interface PermissionEssentialProps {
  name: string;
  action: PermissionActionEnum;
  subject: PermissionSubjectEnum;
  conditions: CaslConditions | null;
}

type PermissionInternalProps = PermissionEssentialProps;

export class Permission extends BaseDomainModel<PermissionInternalProps> {
  private _deletedAt: Date | null;

  private constructor(
    props: PermissionInternalProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
    deletedAt?: Date | null,
  ) {
    super(props, id, createdAt, updatedAt);
    this._deletedAt = deletedAt ?? null;
    this.validate();
  }

  static _create(
    props: PermissionInternalProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
    deletedAt?: Date | null,
  ): Permission {
    return new Permission(props, id, createdAt, updatedAt, deletedAt);
  }

  get deletedAt(): Date | null {
    return this._deletedAt;
  }

  private validate(): void {
    if (!this.props.name || this.props.name.trim().length === 0) {
      throw new Error('Permission name is required');
    }
    if (!this.props.action || this.props.action.trim().length === 0) {
      throw new Error('Permission action is required');
    }
    if (!this.props.subject || this.props.subject.trim().length === 0) {
      throw new Error('Permission subject is required');
    }
  }

  get name(): PermissionEssentialProps['name'] {
    return this.props.name;
  }

  get action(): PermissionEssentialProps['action'] {
    return this.props.action;
  }

  get subject(): PermissionEssentialProps['subject'] {
    return this.props.subject;
  }

  get conditions(): PermissionEssentialProps['conditions'] {
    return this.props.conditions;
  }

  updateName(name: NonNullable<PermissionEssentialProps['name']>): void {
    this.props.name = name;
    this.touch();
  }

  updateAction(action: NonNullable<PermissionEssentialProps['action']>): void {
    this.props.action = action;
    this.touch();
  }

  updateSubject(
    subject: NonNullable<PermissionEssentialProps['subject']>,
  ): void {
    this.props.subject = subject;
    this.touch();
  }

  updateConditions(conditions: PermissionEssentialProps['conditions']): void {
    this.props.conditions = conditions;
    this.touch();
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      name: this.name,
      action: this.action,
      subject: this.subject,
      conditions: this.conditions,
      deletedAt: this.deletedAt,
    };
  }
}
