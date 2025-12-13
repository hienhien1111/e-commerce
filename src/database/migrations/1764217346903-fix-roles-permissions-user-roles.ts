import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixRolesPermissionsUserRoles1764217346903
  implements MigrationInterface
{
  name = 'FixRolesPermissionsUserRoles1764217346903';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "FK_b23c65e50a758245a33ee35fda1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "FK_87b8888186ca9769c960e926870"`,
    );

    await queryRunner.query(
      `ALTER TABLE "roles" ALTER COLUMN "name" SET NOT NULL`,
    );

    await queryRunner.query(
      `DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_roles_name'
        ) THEN
          ALTER TABLE "roles" ADD CONSTRAINT "UQ_roles_name" UNIQUE ("name");
        END IF;
      END $$;`,
    );

    await queryRunner.query(
      `DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum WHERE enumlabel = 'kyc' AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'permission_subject_enum'
          )
        ) THEN
          ALTER TYPE "public"."permission_subject_enum" ADD VALUE 'kyc';
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum WHERE enumlabel = 'trading_account' AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'permission_subject_enum'
          )
        ) THEN
          ALTER TYPE "public"."permission_subject_enum" ADD VALUE 'trading_account';
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum WHERE enumlabel = 'payment_account' AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'permission_subject_enum'
          )
        ) THEN
          ALTER TYPE "public"."permission_subject_enum" ADD VALUE 'payment_account';
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum WHERE enumlabel = 'account' AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'permission_subject_enum'
          )
        ) THEN
          ALTER TYPE "public"."permission_subject_enum" ADD VALUE 'account';
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum WHERE enumlabel = 'investment' AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'permission_subject_enum'
          )
        ) THEN
          ALTER TYPE "public"."permission_subject_enum" ADD VALUE 'investment';
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum WHERE enumlabel = 'transaction' AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'permission_subject_enum'
          )
        ) THEN
          ALTER TYPE "public"."permission_subject_enum" ADD VALUE 'transaction';
        END IF;
      END $$;`,
    );

    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD COLUMN IF NOT EXISTS "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD COLUMN IF NOT EXISTS "assigned_by" uuid`,
    );

    await queryRunner.query(
      `UPDATE "permissions" SET "name" = REPLACE("name", '_', ':') WHERE "name" LIKE '%_%'`,
    );

    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "FK_87b8888186ca9769c960e926870" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "FK_b23c65e50a758245a33ee35fda1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "FK_user_roles_assigned_by" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "FK_user_roles_assigned_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "FK_b23c65e50a758245a33ee35fda1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "FK_87b8888186ca9769c960e926870"`,
    );

    await queryRunner.query(
      `UPDATE "permissions" SET "name" = REPLACE("name", ':', '_') WHERE "name" LIKE '%:%'`,
    );

    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP COLUMN IF EXISTS "assigned_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP COLUMN IF EXISTS "assigned_at"`,
    );

    await queryRunner.query(
      `ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "UQ_roles_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ALTER COLUMN "name" DROP NOT NULL`,
    );
  }
}
