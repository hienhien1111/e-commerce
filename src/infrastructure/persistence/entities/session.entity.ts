import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  DeleteDateColumn,
  Column,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import type { UserEntity } from '@/infrastructure/persistence/entities/user.entity';

import { EntityHelper } from '@/utils/entity-helper';
import { generateUuidV7 } from '@/utils/uuid-v7';

@Entity({
  name: 'sessions',
})
export class SessionEntity extends EntityHelper {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateUuidV7();
    }
  }

  @ManyToOne('UserEntity', {
    eager: true,
  })
  @JoinColumn({ name: 'user_id' })
  @Index()
  user: UserEntity;

  @Column({ name: 'hash' })
  hash: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
