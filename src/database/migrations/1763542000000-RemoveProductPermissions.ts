import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveProductPermissions1763542000000
  implements MigrationInterface
{
  name = 'RemoveProductPermissions1763542000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "role_permission" WHERE "permission_id" IN (SELECT "id" FROM "permission" WHERE ("subject")::text = 'product')`,
    );
    await queryRunner.query(
      `DELETE FROM "permission" WHERE ("subject")::text = 'product'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // This migration is not reversible as we don't store the deleted permissions
  }
}
