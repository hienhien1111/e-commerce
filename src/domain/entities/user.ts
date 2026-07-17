import { BaseDomainModel } from '@/shared/domain/base-domain-model';
import { Role } from '@/domain/entities/role';
import { AuthProvidersEnum } from '@/domain/enums/auth-providers.enum';

export interface UserEssentialProps {
  email: string | null;
  password: string | null;
  provider: AuthProvidersEnum | string;
  socialId: string | null;
  firstName: string | null;
  lastName: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  avatarPublicId?: string | null;
  verifiedAt?: Date | null;
}

type UserRoleProps = {
  role: Role | null;
  roleId: string | null;
};

type UserInternalProps = UserEssentialProps & UserRoleProps;

export class User extends BaseDomainModel<UserInternalProps> {
  private _deletedAt: Date | null;

  private constructor(
    props: UserInternalProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
    deletedAt?: Date | null,
    shouldValidate = true,
  ) {
    super(props, id, createdAt, updatedAt);
    this._deletedAt = deletedAt ?? null;
    if (shouldValidate) {
      this.validate();
    }
  }

  static _create(
    props: UserInternalProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
    deletedAt?: Date | null,
    shouldValidate = true,
  ): User {
    return new User(props, id, createdAt, updatedAt, deletedAt, shouldValidate);
  }

  private validate(): void {
    if (!this.props.provider) {
      throw new Error('User provider is required');
    }

    if (this.props.provider === AuthProvidersEnum.EMAIL && !this.props.email) {
      throw new Error('Email is required for email provider');
    }
  }

  get email(): UserEssentialProps['email'] {
    return this.props.email;
  }

  get password(): UserEssentialProps['password'] {
    return this.props.password;
  }

  get provider(): UserEssentialProps['provider'] {
    return this.props.provider;
  }

  get socialId(): UserEssentialProps['socialId'] {
    return this.props.socialId;
  }

  get firstName(): UserEssentialProps['firstName'] {
    return this.props.firstName;
  }

  get lastName(): UserEssentialProps['lastName'] {
    return this.props.lastName;
  }

  get phone(): string | null {
    return this.props.phone ?? null;
  }

  get avatarUrl(): string | null {
    return this.props.avatarUrl ?? null;
  }

  get avatarPublicId(): string | null {
    return this.props.avatarPublicId ?? null;
  }

  get verifiedAt(): Date | null {
    return this.props.verifiedAt ?? null;
  }

  get role(): UserRoleProps['role'] {
    return this.props.role;
  }

  get roleId(): UserRoleProps['roleId'] {
    return this.props.roleId;
  }

  get deletedAt(): Date | null {
    return this._deletedAt;
  }

  updateEmail(email: NonNullable<UserEssentialProps['email']>): void {
    this.props.email = email;
    this.touch();
  }

  updatePassword(password: NonNullable<UserEssentialProps['password']>): void {
    this.props.password = password;
    this.touch();
  }

  updateProfile(
    firstName?: UserEssentialProps['firstName'],
    lastName?: UserEssentialProps['lastName'],
    phone?: string | null,
  ): void {
    if (firstName !== undefined) {
      this.props.firstName = firstName;
    }
    if (lastName !== undefined) {
      this.props.lastName = lastName;
    }
    if (phone !== undefined) {
      this.props.phone = phone;
    }
    this.touch();
  }

  updateAvatar(avatarUrl: string | null, avatarPublicId: string | null): void {
    this.props.avatarUrl = avatarUrl;
    this.props.avatarPublicId = avatarPublicId;
    this.touch();
  }

  confirmEmail(): void {
    if (!this.props.verifiedAt) {
      this.props.verifiedAt = new Date();
      this.touch();
    }
  }

  assignRole(role: NonNullable<UserRoleProps['role']>): void {
    this.props.role = role;
    this.props.roleId = role.id;
    this.touch();
  }

  loadRole(role: NonNullable<UserRoleProps['role']>): void {
    this.props.role = role;
    this.props.roleId = role.id;
  }

  clearRole(): void {
    this.props.role = null;
    this.props.roleId = null;
    this.touch();
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      email: this.email,
      provider: this.provider,
      socialId: this.socialId,
      firstName: this.firstName,
      lastName: this.lastName,
      phone: this.phone,
      avatarUrl: this.avatarUrl,
      verifiedAt: this.verifiedAt,
      role: this.role ? this.role.toJSON() : null,
      deletedAt: this.deletedAt,
    };
  }
}
