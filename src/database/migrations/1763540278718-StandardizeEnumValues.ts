import { MigrationInterface, QueryRunner } from 'typeorm';

export class StandardizeEnumValues1763540278718 implements MigrationInterface {
  name = 'StandardizeEnumValues1763540278718';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "role_permission" DROP CONSTRAINT "FK_3d0a7155eafd75ddba5a7013368"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permission" DROP CONSTRAINT "FK_e3a3ba47b7ca00fd23be4ebd6cf"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_PERMISSION_ACTION_SUBJECT"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ROLE_PERMISSION_ROLE_ID"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ROLE_PERMISSION_PERMISSION_ID"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_ROLE_PERMISSION_UNIQUE"`);
    await queryRunner.query(
      `ALTER TABLE "role_permission" ADD CONSTRAINT "PK_19a94c31d4960ded0dcd0397759" PRIMARY KEY ("role_id", "permission_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "permission" ALTER COLUMN "subject" TYPE character varying USING "subject"::text`,
    );
    await queryRunner.query(
      `UPDATE "permission" SET "subject" = LOWER("subject") WHERE "subject" != LOWER("subject")`,
    );
    await queryRunner.query(
      `UPDATE "user" SET "provider" = LOWER("provider") WHERE "provider" != LOWER("provider")`,
    );
    await queryRunner.query(
      `DELETE FROM "role_permission" WHERE "permission_id" IN (SELECT "id" FROM "permission" WHERE "subject" = 'product')`,
    );
    await queryRunner.query(
      `DELETE FROM "permission" WHERE "subject" = 'product'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."permission_subject_enum" RENAME TO "permission_subject_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."permission_subject_enum" AS ENUM('user', 'permission', 'role', 'all')`,
    );
    await queryRunner.query(
      `ALTER TABLE "permission" ALTER COLUMN "subject" TYPE "public"."permission_subject_enum" USING "subject"::"public"."permission_subject_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."permission_subject_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "provider" SET DEFAULT 'email'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3d0a7155eafd75ddba5a701336" ON "role_permission" ("role_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e3a3ba47b7ca00fd23be4ebd6c" ON "role_permission" ("permission_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permission" ADD CONSTRAINT "FK_3d0a7155eafd75ddba5a7013368" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permission" ADD CONSTRAINT "FK_e3a3ba47b7ca00fd23be4ebd6cf" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "role_permission" DROP CONSTRAINT "FK_e3a3ba47b7ca00fd23be4ebd6cf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permission" DROP CONSTRAINT "FK_3d0a7155eafd75ddba5a7013368"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e3a3ba47b7ca00fd23be4ebd6c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3d0a7155eafd75ddba5a701336"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."permission_subject_enum_old" AS ENUM('User', 'Permission', 'Role', 'all')`,
    );
    await queryRunner.query(
      `ALTER TABLE "permission" ALTER COLUMN "subject" TYPE "public"."permission_subject_enum_old" USING "subject"::"text"::"public"."permission_subject_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."permission_subject_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."permission_subject_enum_old" RENAME TO "permission_subject_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permission" DROP CONSTRAINT "PK_19a94c31d4960ded0dcd0397759"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ROLE_PERMISSION_UNIQUE" ON "role_permission" ("permission_id", "role_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ROLE_PERMISSION_PERMISSION_ID" ON "role_permission" ("permission_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ROLE_PERMISSION_ROLE_ID" ON "role_permission" ("role_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_PERMISSION_ACTION_SUBJECT" ON "permission" ("action", "subject") `,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permission" ADD CONSTRAINT "FK_e3a3ba47b7ca00fd23be4ebd6cf" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permission" ADD CONSTRAINT "FK_3d0a7155eafd75ddba5a7013368" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
