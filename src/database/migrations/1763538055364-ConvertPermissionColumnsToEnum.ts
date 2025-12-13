import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertPermissionColumnsToEnum1763538055364
  implements MigrationInterface
{
  name = 'ConvertPermissionColumnsToEnum1763538055364';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."permission_action_enum" AS ENUM('manage', 'create', 'read', 'update', 'delete')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."permission_subject_enum" AS ENUM('user', 'permission', 'role', 'all')`,
    );
    await queryRunner.query(
      `ALTER TABLE "permission" ALTER COLUMN "action" TYPE "public"."permission_action_enum" USING "action"::"public"."permission_action_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "permission" ALTER COLUMN "subject" TYPE "public"."permission_subject_enum" USING "subject"::"public"."permission_subject_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "permission" ALTER COLUMN "subject" TYPE character varying USING "subject"::text`,
    );
    await queryRunner.query(
      `ALTER TABLE "permission" ALTER COLUMN "action" TYPE character varying USING "action"::text`,
    );
    await queryRunner.query(`DROP TYPE "public"."permission_subject_enum"`);
    await queryRunner.query(`DROP TYPE "public"."permission_action_enum"`);
  }
}
