import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityHelper } from '@/utils/entity-helper';

@Entity('user_profiles')
export class UserProfileEntity extends EntityHelper {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'uuid', unique: true, name: 'user_id' })
  userId: string;

  @OneToOne('UserEntity')
  @JoinColumn({ name: 'user_id' })
  user?: unknown;

  @Column({ type: 'varchar', nullable: true, name: 'first_name' })
  firstName: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'last_name' })
  lastName: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'date', nullable: true, name: 'date_of_birth' })
  dateOfBirth: Date | null;

  @Column({ type: 'varchar', nullable: true })
  country: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
