---
to: src/infrastructure/persistence/entities/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.entity.ts
---
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  BeforeInsert,
} from 'typeorm';
import { EntityHelper } from '@/utils/entity-helper';
import { generateUuidV7 } from '@/utils/uuid-v7';

@Entity('<%= h.inflection.transform(name, ['pluralize', 'underscore', 'dasherize']) %>')
export class <%= name %>Entity extends EntityHelper {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = generateUuidV7();
    }
  }

  @Column({ type: 'varchar' })
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
