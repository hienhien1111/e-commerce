import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'alpaca_token' })
export class TradingTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'text' })
  accessToken: string;

  @Column({ type: 'varchar', nullable: true })
  tokenType: string | null;

  @Column({ type: 'varchar', nullable: true })
  scope: string | null;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  accountId: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
