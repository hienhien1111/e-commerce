import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityHelper } from '@/utils/entity-helper';
import { StreakTypeEnum } from '@/domain/enums/streak-type.enum';

@Entity('streaks')
export class StreakEntity extends EntityHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: StreakTypeEnum })
  type: StreakTypeEnum;

  @Column({ type: 'int' })
  duration: number;

  @Column({
    type: 'decimal',
    precision: 20,
    scale: 2,
    nullable: true,
    name: 'target_amount',
  })
  targetAmount: number | null;

  @Column({ type: 'jsonb', nullable: true })
  reward: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
