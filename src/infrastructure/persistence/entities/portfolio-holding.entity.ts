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
import { AssetTypeEnum } from '@/domain/enums/asset-type.enum';

@Entity('portfolio_holdings')
export class PortfolioHoldingEntity extends EntityHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne('UserEntity')
  @JoinColumn({ name: 'user_id' })
  user?: unknown;

  @Index()
  @Column({ type: 'varchar' })
  symbol: string;

  @Column({ type: 'varchar', name: 'asset_name' })
  assetName: string;

  @Column({ type: 'enum', enum: AssetTypeEnum, name: 'asset_type' })
  assetType: AssetTypeEnum;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  quantity: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, name: 'average_price' })
  averagePrice: number;

  @Column({
    type: 'decimal',
    precision: 20,
    scale: 8,
    nullable: true,
    name: 'current_price',
  })
  currentPrice: number | null;

  @Column({ type: 'decimal', precision: 20, scale: 8, name: 'total_cost' })
  totalCost: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, name: 'current_value' })
  currentValue: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, name: 'gain_loss' })
  gainLoss: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 4,
    name: 'gain_loss_percentage',
  })
  gainLossPercentage: number;

  @Column({ type: 'boolean', default: false, name: 'is_favorite' })
  isFavorite: boolean;

  @Column({ type: 'timestamptz', name: 'last_synced_at' })
  lastSyncedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
