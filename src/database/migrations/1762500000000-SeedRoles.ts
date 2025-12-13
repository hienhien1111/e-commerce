import { MigrationInterface, QueryRunner } from 'typeorm';
import { generateUuidV7 } from '@/utils/uuid-v7';

export class SeedRoles1762500000000 implements MigrationInterface {
  name = 'SeedRoles1762500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const userRoleId = generateUuidV7();
    const adminRoleId = generateUuidV7();

    await queryRunner.query(
      `
      INSERT INTO "role" ("id", "name") VALUES
        ($1, 'user'),
        ($2, 'admin')
      ON CONFLICT ("id") DO NOTHING;
    `,
      [userRoleId, adminRoleId],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role" WHERE "name" IN ('user', 'admin');
    `);
  }
}
