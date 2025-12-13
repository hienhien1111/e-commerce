import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreatePermissionTable1763452526002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create permission table
    await queryRunner.createTable(
      new Table({
        name: 'permission',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'action',
            type: 'varchar',
          },
          {
            name: 'subject',
            type: 'varchar',
          },
          {
            name: 'conditions',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'permission',
      new TableIndex({
        name: 'IDX_PERMISSION_ACTION_SUBJECT',
        columnNames: ['action', 'subject'],
      }),
    );

    // Create role_permission junction table
    await queryRunner.createTable(
      new Table({
        name: 'role_permission',
        columns: [
          {
            name: 'role_id',
            type: 'uuid',
          },
          {
            name: 'permission_id',
            type: 'uuid',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['role_id'],
            referencedTableName: 'role',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['permission_id'],
            referencedTableName: 'permission',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create indexes for junction table
    await queryRunner.createIndex(
      'role_permission',
      new TableIndex({
        name: 'IDX_ROLE_PERMISSION_ROLE_ID',
        columnNames: ['role_id'],
      }),
    );

    await queryRunner.createIndex(
      'role_permission',
      new TableIndex({
        name: 'IDX_ROLE_PERMISSION_PERMISSION_ID',
        columnNames: ['permission_id'],
      }),
    );

    // Create unique constraint on role_id and permission_id combination
    await queryRunner.createIndex(
      'role_permission',
      new TableIndex({
        name: 'IDX_ROLE_PERMISSION_UNIQUE',
        columnNames: ['role_id', 'permission_id'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.dropIndex(
      'role_permission',
      'IDX_ROLE_PERMISSION_UNIQUE',
    );
    await queryRunner.dropIndex(
      'role_permission',
      'IDX_ROLE_PERMISSION_PERMISSION_ID',
    );
    await queryRunner.dropIndex(
      'role_permission',
      'IDX_ROLE_PERMISSION_ROLE_ID',
    );
    await queryRunner.dropIndex('permission', 'IDX_PERMISSION_ACTION_SUBJECT');

    // Drop tables
    await queryRunner.dropTable('role_permission');
    await queryRunner.dropTable('permission');
  }
}
