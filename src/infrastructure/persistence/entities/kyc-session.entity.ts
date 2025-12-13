import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { EntityHelper } from '@/utils/entity-helper';
import { KycStepEnum } from '@/domain/enums/kyc-step.enum';

@Entity('kyc_sessions')
export class KycSessionEntity extends EntityHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'kyc_verification_id' })
  kycVerificationId: string;

  @ManyToOne('KycVerificationEntity')
  @JoinColumn({ name: 'kyc_verification_id' })
  kycVerification?: unknown;

  @Column({ type: 'varchar', name: 'session_token' })
  sessionToken: string;

  @Column({ type: 'enum', enum: KycStepEnum })
  step: KycStepEnum;

  @Column({ type: 'jsonb', nullable: true, name: 'session_data' })
  sessionData: Record<string, unknown> | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'expires_at' })
  expiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
