import { PaymentUser } from '@/domain/entities/payment-user';
import { KycStatus } from '@/domain/value-objects/kyc-status';
import { TransfiUserEntity } from '@/infrastructure/persistence/entities/transfi-user.entity';

export class TransfiUserMapper {
  static toDomain(raw: TransfiUserEntity): PaymentUser {
    return PaymentUser._create(
      {
        userId: raw.userId,
        transfiUserId: raw.transfiUserId,
        userType: raw.userType,
        email: raw.email,
        firstName: raw.firstName ?? null,
        lastName: raw.lastName ?? null,
        companyName: raw.companyName ?? null,
        kycStatus: KycStatus.fromString(raw.kycStatus),
        kycLevel: raw.kycLevel,
        metadata: raw.metadata ?? null,
      },
      raw.id,
      raw.createdAt,
      raw.updatedAt,
      true,
    );
  }
}
