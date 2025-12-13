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

@Entity('bank_accounts')
export class BankAccountEntity extends EntityHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne('UserEntity')
  @JoinColumn({ name: 'user_id' })
  user?: unknown;

  @Column({ type: 'varchar', name: 'bank_name' })
  bankName: string;

  @Column({ type: 'varchar', name: 'account_number' })
  accountNumber: string;

  @Column({ type: 'varchar', name: 'account_holder_name' })
  accountHolderName: string;

  @Column({ type: 'varchar', nullable: true, name: 'routing_number' })
  routingNumber: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'swift_code' })
  swiftCode: string | null;

  @Column({ type: 'varchar' })
  currency: string;

  @Column({ type: 'boolean', default: false, name: 'is_primary' })
  isPrimary: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_verified' })
  isVerified: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'verified_at' })
  verifiedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
