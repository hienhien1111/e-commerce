import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  ManyToMany,
  JoinTable,
  PrimaryColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import type { RoleEntity } from '@/infrastructure/persistence/entities/role.entity';
import { AuthProvidersEnum } from '@/domain/enums/auth-providers.enum';
import { generateUuidV7 } from '@/utils/uuid-v7';

@Entity({
  name: 'users',
})
export class UserEntity {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateUuidV7();
    }
  }

  @Column({ type: String, unique: true, nullable: true, name: 'email' })
  email: string | null;

  @Column({ nullable: true, name: 'password' })
  password?: string;

  @Column({
    type: 'varchar',
    default: 'active',
    name: 'state',
  })
  state: string;

  @Column({ default: AuthProvidersEnum.EMAIL, name: 'provider' })
  provider: string;

  @Index()
  @Column({ type: String, nullable: true, name: 'social_id' })
  socialId?: string | null;

  @Index()
  @Column({ type: String, nullable: true, name: 'first_name' })
  firstName: string | null;

  @Index()
  @Column({ type: String, nullable: true, name: 'last_name' })
  lastName: string | null;

  @ManyToMany('RoleEntity', 'users', {
    eager: true,
  })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles?: RoleEntity[];

  @Column({ type: 'timestamptz', nullable: true, name: 'verified_at' })
  verifiedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'first_login_at' })
  firstLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
