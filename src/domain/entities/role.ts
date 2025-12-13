import { BaseDomainModel } from '@/shared/domain/base-domain-model';
import { Permission } from '@/domain/entities/permission';

export interface RoleEssentialProps {
  name: string;
}

type RoleInternalProps = RoleEssentialProps & {
  permissions?: Permission[] | null;
};

export class Role extends BaseDomainModel<RoleInternalProps> {
  private constructor(
    props: RoleInternalProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(props, id, createdAt, updatedAt);
    this.validate();
  }

  static _create(
    props: RoleInternalProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
  ): Role {
    return new Role(props, id, createdAt, updatedAt);
  }

  private validate(): void {
    if (!this.props.name || this.props.name.trim().length === 0) {
      throw new Error('Role name is required');
    }
  }

  get name(): RoleEssentialProps['name'] {
    return this.props.name;
  }

  get permissions(): RoleInternalProps['permissions'] {
    return this.props.permissions;
  }

  updateName(name: NonNullable<RoleEssentialProps['name']>): void {
    this.props.name = name;
    this.touch();
  }

  assignPermissions(permissions: Permission[]): void {
    this.props.permissions = permissions;
    this.touch();
  }

  loadPermissions(permissions: Permission[]): void {
    this.props.permissions = permissions;
  }

  clearPermissions(): void {
    this.props.permissions = null;
    this.touch();
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      name: this.name,
      permissions: this.permissions?.map((p) => p.toJSON()) ?? null,
    };
  }
}
