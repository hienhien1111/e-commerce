import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  BeforeInsert,
  ManyToMany,
} from 'typeorm';
import { EntityHelper } from '@/utils/entity-helper';
import { generateUuidV7 } from '@/utils/uuid-v7';
import type { RoleEntity } from '@/infrastructure/persistence/entities/role.entity';
import type { CaslConditions } from '@/domain/types/casl-conditions.type';
import { PermissionActionEnum } from '@/domain/enums/permission-action.enum';
import { PermissionSubjectEnum } from '@/domain/enums/permission-subject.enum';

@Entity('permissions')
export class PermissionEntity extends EntityHelper {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateUuidV7();
    }
  }

  @Column({ type: 'varchar', unique: true, name: 'name' })
  name: string;

  @Column({
    type: 'enum',
    enum: PermissionActionEnum,
    name: 'action',
  })
  action: PermissionActionEnum;

  @Column({
    type: 'enum',
    enum: PermissionSubjectEnum,
    name: 'subject',
  })
  subject: PermissionSubjectEnum;

  @Column({ type: 'jsonb', nullable: true, name: 'conditions' })
  conditions: CaslConditions;

  @ManyToMany('RoleEntity', 'permissions')
  roles?: RoleEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
