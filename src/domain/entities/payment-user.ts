import { BaseDomainModel } from '@/shared/domain/base-domain-model';
import { KycStatus } from '@/domain/value-objects/kyc-status';

export interface PaymentUserEssentialProps {
  userId: string;
  transfiUserId: string;
  userType: 'individual' | 'business';
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  kycStatus: KycStatus;
  kycLevel: number;
  metadata?: Record<string, unknown> | null;
}

export class PaymentUser extends BaseDomainModel<PaymentUserEssentialProps> {
  private constructor(
    props: PaymentUserEssentialProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
    shouldValidate = true,
  ) {
    super(props, id, createdAt, updatedAt);
    if (shouldValidate) {
      this.validate();
    }
  }

  static _create(
    props: PaymentUserEssentialProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
    shouldValidate = true,
  ): PaymentUser {
    return new PaymentUser(props, id, createdAt, updatedAt, shouldValidate);
  }

  private validate(): void {
    if (!this.props.userId) {
      throw new Error('User ID is required');
    }
    if (!this.props.transfiUserId) {
      throw new Error('Transfi User ID is required');
    }
    if (!this.props.email) {
      throw new Error('Email is required');
    }
    if (this.props.userType === 'individual' && !this.props.firstName) {
      throw new Error('First name is required for individual users');
    }
    if (this.props.userType === 'business' && !this.props.companyName) {
      throw new Error('Company name is required for business users');
    }
  }

  get userId(): PaymentUserEssentialProps['userId'] {
    return this.props.userId;
  }

  get transfiUserId(): PaymentUserEssentialProps['transfiUserId'] {
    return this.props.transfiUserId;
  }

  get userType(): PaymentUserEssentialProps['userType'] {
    return this.props.userType;
  }

  get email(): PaymentUserEssentialProps['email'] {
    return this.props.email;
  }

  get firstName(): PaymentUserEssentialProps['firstName'] {
    return this.props.firstName;
  }

  get lastName(): PaymentUserEssentialProps['lastName'] {
    return this.props.lastName;
  }

  get companyName(): PaymentUserEssentialProps['companyName'] {
    return this.props.companyName;
  }

  get kycStatus(): PaymentUserEssentialProps['kycStatus'] {
    return this.props.kycStatus;
  }

  get kycLevel(): PaymentUserEssentialProps['kycLevel'] {
    return this.props.kycLevel;
  }

  get metadata(): PaymentUserEssentialProps['metadata'] {
    return this.props.metadata;
  }

  updateKycStatus(kycStatus: KycStatus): void {
    this.props.kycStatus = kycStatus;
    this.touch();
  }

  updateKycLevel(kycLevel: number): void {
    this.props.kycLevel = kycLevel;
    this.touch();
  }

  updateEmail(email: string): void {
    this.props.email = email;
    this.touch();
  }

  updateProfile(firstName?: string | null, lastName?: string | null): void {
    if (this.props.userType === 'individual') {
      if (firstName !== undefined) {
        this.props.firstName = firstName;
      }
      if (lastName !== undefined) {
        this.props.lastName = lastName;
      }
    }
    this.touch();
  }

  updateCompanyName(companyName: string): void {
    if (this.props.userType === 'business') {
      this.props.companyName = companyName;
      this.touch();
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      userId: this.userId,
      transfiUserId: this.transfiUserId,
      userType: this.userType,
      email: this.email,
      firstName: this.firstName ?? null,
      lastName: this.lastName ?? null,
      companyName: this.companyName ?? null,
      kycStatus: this.kycStatus.toString(),
      kycLevel: this.kycLevel,
      metadata: this.metadata ?? null,
    };
  }
}
