import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { EntityHelper } from '@/utils/entity-helper';
import { KycStatusEnum } from '@/domain/enums/kyc-status.enum';

@Entity('kyc_verifications')
export class KycVerificationEntity extends EntityHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne('UserEntity')
  @JoinColumn({ name: 'user_id' })
  user?: unknown;

  @Column({ type: 'varchar', default: 'vnpt_ekyc' })
  provider: string;

  @Index()
  @Column({ type: 'varchar', unique: true, name: 'external_verification_id' })
  externalVerificationId: string;

  @Column({
    type: 'enum',
    enum: KycStatusEnum,
    default: KycStatusEnum.PENDING,
  })
  status: KycStatusEnum;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason: string | null;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
    name: 'confidence_score',
  })
  confidenceScore: number | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'verified_at' })
  verifiedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'expires_at' })
  expiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
