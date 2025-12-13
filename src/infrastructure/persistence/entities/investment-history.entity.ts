import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { EntityHelper } from '@/utils/entity-helper';
import { InvestmentTypeEnum } from '@/domain/enums/investment-type.enum';
import { AssetTypeEnum } from '@/domain/enums/asset-type.enum';
import { TransactionStatusEnum } from '@/domain/enums/transaction-status.enum';
import { OrderTypeEnum } from '@/domain/enums/order-type.enum';

@Entity('investment_history')
export class InvestmentHistoryEntity extends EntityHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne('UserEntity')
  @JoinColumn({ name: 'user_id' })
  user?: unknown;

  @Column({ type: 'enum', enum: InvestmentTypeEnum })
  type: InvestmentTypeEnum;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  amount: number;

  @Column({ type: 'varchar' })
  currency: string;

  @Column({
    type: 'enum',
    enum: AssetTypeEnum,
    nullable: true,
    name: 'investment_type',
  })
  investmentType: AssetTypeEnum | null;

  @Column({ type: 'enum', enum: TransactionStatusEnum })
  status: TransactionStatusEnum;

  @Column({
    type: 'enum',
    enum: OrderTypeEnum,
    nullable: true,
    name: 'order_type',
  })
  orderType: OrderTypeEnum | null;

  @Index()
  @Column({
    type: 'varchar',
    nullable: true,
    name: 'external_reference_id',
  })
  externalReferenceId: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true, name: 'trading_account_id' })
  tradingAccountId: string | null;

  @ManyToOne('TradingAccountEntity')
  @JoinColumn({ name: 'trading_account_id' })
  tradingAccount?: unknown;

  @Index()
  @Column({ type: 'uuid', nullable: true, name: 'payment_account_id' })
  paymentAccountId: string | null;

  @ManyToOne('PaymentAccountEntity')
  @JoinColumn({ name: 'payment_account_id' })
  paymentAccount?: unknown;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'completed_at' })
  completedAt: Date | null;
}
