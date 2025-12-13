import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateRoleNamesToLowercase1763541000000
  implements MigrationInterface
{
  name = 'UpdateRoleNamesToLowercase1763541000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "role" SET "name" = LOWER("name") WHERE "name" != LOWER("name")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "role" SET "name" = UPPER("name") WHERE "name" != UPPER("name")`,
    );
  }
}
