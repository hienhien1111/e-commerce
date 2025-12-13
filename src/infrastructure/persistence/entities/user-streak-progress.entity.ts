import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { EntityHelper } from '@/utils/entity-helper';

@Entity('user_streak_progress')
@Unique(['userId', 'streakId'])
export class UserStreakProgressEntity extends EntityHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne('UserEntity')
  @JoinColumn({ name: 'user_id' })
  user?: unknown;

  @Index()
  @Column({ type: 'uuid', name: 'streak_id' })
  streakId: string;

  @ManyToOne('StreakEntity')
  @JoinColumn({ name: 'streak_id' })
  streak?: unknown;

  @Column({ type: 'int', default: 0, name: 'current_streak' })
  currentStreak: number;

  @Column({
    type: 'decimal',
    precision: 20,
    scale: 2,
    default: 0,
    name: 'total_invested',
  })
  totalInvested: number;

  @Column({ type: 'date', nullable: true, name: 'last_investment_date' })
  lastInvestmentDate: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'completed_at' })
  completedAt: Date | null;

  @Column({ type: 'boolean', default: false, name: 'reward_claimed' })
  rewardClaimed: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
