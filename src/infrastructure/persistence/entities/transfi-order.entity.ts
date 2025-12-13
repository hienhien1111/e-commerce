import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type ValueTransformer,
} from 'typeorm';
import { TransfiUserEntity } from './transfi-user.entity';

type NumericDbValue = string | number | null;

const numericTransformer: ValueTransformer = {
  to(value: number | null): number | null {
    return value;
  },
  from(value: NumericDbValue): number | null {
    if (value === null) {
      return null;
    }
    return typeof value === 'number' ? value : Number.parseFloat(value);
  },
};

@Entity({ name: 'transfi_orders' })
export class TransfiOrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', unique: true })
  orderId: string;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  externalOrderId: string | null;

  @Index()
  @Column({ type: 'uuid' })
  transfiUserId: string;

  @ManyToOne(() => TransfiUserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transfiUserId' })
  transfiUser: TransfiUserEntity;

  @Column({ type: 'varchar' })
  orderType: 'payin' | 'payout';

  @Column({ type: 'varchar' })
  currencyType: 'fiat' | 'crypto';

  @Column({ type: 'varchar' })
  sourceCurrency: string;

  @Column({ type: 'varchar' })
  destinationCurrency: string;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 8,
    transformer: numericTransformer,
  })
  sourceAmount: number;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 8,
    nullable: true,
    transformer: numericTransformer,
  })
  destinationAmount: number | null;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 8,
    default: 0,
    transformer: numericTransformer,
  })
  fee: number;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 8,
    nullable: true,
    transformer: numericTransformer,
  })
  rate: number | null;

  @Column({ type: 'varchar' })
  paymentMethod: string;

  @Index()
  @Column({ type: 'varchar', default: 'pending' })
  status: string;

  @Column({ type: 'text', nullable: true })
  paymentUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  transactionHash: string | null;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ type: 'varchar', nullable: true })
  callbackUrl: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp', name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updatedAt' })
  updatedAt: Date;

  @Column({ type: 'timestamp', name: 'completedAt', nullable: true })
  completedAt: Date | null;
}
