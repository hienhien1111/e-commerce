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
import { TradingProviderEnum } from '@/domain/enums/trading-provider.enum';
import { AccountStatusEnum } from '@/domain/enums/account-status.enum';

@Entity('trading_accounts')
export class TradingAccountEntity extends EntityHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne('UserEntity')
  @JoinColumn({ name: 'user_id' })
  user?: unknown;

  @Column({ type: 'enum', enum: TradingProviderEnum })
  provider: TradingProviderEnum;

  @Column({ type: 'varchar', name: 'account_number' })
  accountNumber: string;

  @Column({ type: 'varchar', nullable: true, name: 'api_key_encrypted' })
  apiKeyEncrypted: string | null;

  @Column({
    type: 'enum',
    enum: AccountStatusEnum,
    default: AccountStatusEnum.PENDING,
  })
  status: AccountStatusEnum;

  @Column({ type: 'varchar', default: 'USD' })
  currency: string;

  @Column({
    type: 'decimal',
    precision: 20,
    scale: 2,
    default: 0,
    name: 'last_equity',
  })
  lastEquity: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
