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
import { PaymentProviderEnum } from '@/domain/enums/payment-provider.enum';
import { AccountStatusEnum } from '@/domain/enums/account-status.enum';

@Entity('payment_accounts')
export class PaymentAccountEntity extends EntityHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne('UserEntity')
  @JoinColumn({ name: 'user_id' })
  user?: unknown;

  @Column({ type: 'enum', enum: PaymentProviderEnum })
  provider: PaymentProviderEnum;

  @Column({ type: 'varchar', name: 'account_id' })
  accountId: string;

  @Column({ type: 'varchar', default: 'USD' })
  currency: string;

  @Column({
    type: 'enum',
    enum: AccountStatusEnum,
    default: AccountStatusEnum.PENDING,
  })
  status: AccountStatusEnum;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
