import { MigrationInterface, QueryRunner } from 'typeorm';

export class HugeUpdate1764191942085 implements MigrationInterface {
  name = 'HugeUpdate1764191942085';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "webauthn_credentials" DROP CONSTRAINT IF EXISTS "FK_webauthn_credentials_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "FK_3d2f174ef04fb312fdebd0ddc53"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "FK_c28e52f758e7bbc53828db92194"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permission" DROP CONSTRAINT IF EXISTS "FK_role_permission_role_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permission" DROP CONSTRAINT IF EXISTS "FK_role_permission_permission_id"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_webauthn_credentials_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_webauthn_credentials_credential_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_9bd2fe7a8e694dedc4ec2f666f"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_58e4dbff0e1a32a9bdc861bb29"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_f0e1b4ecdca13b177e2e3a0613"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_3d2f174ef04fb312fdebd0ddc5"`,
    );

    await queryRunner.query(`ALTER TABLE "user" RENAME TO "users"`);
    await queryRunner.query(`ALTER TABLE "role" RENAME TO "roles"`);
    await queryRunner.query(`ALTER TABLE "permission" RENAME TO "permissions"`);
    await queryRunner.query(`ALTER TABLE "session" RENAME TO "sessions"`);
    await queryRunner.query(
      `ALTER TABLE "role_permission" RENAME TO "role_permissions"`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "socialId" TO "social_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "firstName" TO "first_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "lastName" TO "last_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "deletedAt" TO "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "roleId" TO "role_id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "sessions" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" RENAME COLUMN "deletedAt" TO "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" RENAME COLUMN "userId" TO "user_id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP`,
    );

    await queryRunner.query(
      `ALTER TABLE "roles" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" RENAME COLUMN "updatedAt" TO "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" RENAME COLUMN "deletedAt" TO "deleted_at"`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "state" character varying NOT NULL DEFAULT 'active'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "first_login_at" TIMESTAMP WITH TIME ZONE`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE USING "created_at"::timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updated_at" TYPE TIMESTAMP WITH TIME ZONE USING "updated_at"::timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "deleted_at" TYPE TIMESTAMP WITH TIME ZONE USING "deleted_at"::timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE USING "created_at"::timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ALTER COLUMN "updated_at" TYPE TIMESTAMP WITH TIME ZONE USING "updated_at"::timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ALTER COLUMN "deleted_at" TYPE TIMESTAMP WITH TIME ZONE USING "deleted_at"::timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE USING "created_at"::timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ALTER COLUMN "updated_at" TYPE TIMESTAMP WITH TIME ZONE USING "updated_at"::timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ALTER COLUMN "deleted_at" TYPE TIMESTAMP WITH TIME ZONE USING "deleted_at"::timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE USING "created_at"::timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" ALTER COLUMN "updated_at" TYPE TIMESTAMP WITH TIME ZONE USING "updated_at"::timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" ALTER COLUMN "deleted_at" TYPE TIMESTAMP WITH TIME ZONE USING "deleted_at"::timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "webauthn_credentials" ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE USING "created_at"::timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "webauthn_credentials" ALTER COLUMN "last_used_at" TYPE TIMESTAMP WITH TIME ZONE USING "last_used_at"::timestamptz`,
    );

    await queryRunner.query(
      `DO $$ BEGIN
        CREATE TYPE "public"."permission_action_enum" AS ENUM('manage', 'create', 'read', 'update', 'delete');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        CREATE TYPE "public"."permission_subject_enum" AS ENUM('user', 'permission', 'role', 'all');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,
    );

    await queryRunner.query(
      `DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'permissions' AND column_name = 'action' AND data_type = 'character varying'
        ) THEN
          ALTER TABLE "permissions" ALTER COLUMN "action" TYPE "public"."permission_action_enum" USING "action"::"public"."permission_action_enum";
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'permissions' AND column_name = 'subject' AND data_type = 'character varying'
        ) THEN
          ALTER TABLE "permissions" ALTER COLUMN "subject" TYPE "public"."permission_subject_enum" USING "subject"::"public"."permission_subject_enum";
        END IF;
      END $$;`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "user_roles" (
        "user_id" uuid NOT NULL,
        "role_id" uuid NOT NULL,
        CONSTRAINT "PK_23ed6f04fe43066df08379fd034" PRIMARY KEY ("user_id", "role_id")
      )`,
    );

    await queryRunner.query(
      `INSERT INTO "user_roles" ("user_id", "role_id")
       SELECT "id", "role_id" FROM "users"
       WHERE "role_id" IS NOT NULL
       ON CONFLICT DO NOTHING`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "role_id"`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_24ed31edd4e42499a687467fdc" ON "users" ("social_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ef2fb839248017665e5033e730" ON "users" ("first_name")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_0408cb491623b121499d4fa238" ON "users" ("last_name")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_085d540d9f418cfbdc7bd55bb1" ON "sessions" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_87b8888186ca9769c960e92687" ON "user_roles" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_b23c65e50a758245a33ee35fda" ON "user_roles" ("role_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_8292f27b760a80388601db2d42" ON "webauthn_credentials" ("credential_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_cf9dd4c89545f22418bfcec368" ON "webauthn_credentials" ("user_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "FK_085d540d9f418cfbdc7bd55bb19" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "FK_87b8888186ca9769c960e926870" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "FK_b23c65e50a758245a33ee35fda1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "webauthn_credentials" ADD CONSTRAINT "FK_webauthn_credentials_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "webauthn_credentials" DROP CONSTRAINT IF EXISTS "FK_webauthn_credentials_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "FK_b23c65e50a758245a33ee35fda1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "FK_87b8888186ca9769c960e926870"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "FK_17022daf3f885f7d35423e9971e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "FK_178199805b901ccd220ab7740ec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "FK_085d540d9f418cfbdc7bd55bb19"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_cf9dd4c89545f22418bfcec368"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_8292f27b760a80388601db2d42"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_b23c65e50a758245a33ee35fda"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_87b8888186ca9769c960e92687"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_085d540d9f418cfbdc7bd55bb1"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_0408cb491623b121499d4fa238"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_ef2fb839248017665e5033e730"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_24ed31edd4e42499a687467fdc"`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role_id" uuid`,
    );
    await queryRunner.query(
      `UPDATE "users" u
       SET "role_id" = (
         SELECT ur."role_id" 
         FROM "user_roles" ur 
         WHERE ur."user_id" = u."id" 
         LIMIT 1
       )`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "user_roles"`);

    await queryRunner.query(
      `ALTER TABLE "webauthn_credentials" ALTER COLUMN "last_used_at" TYPE TIMESTAMP USING "last_used_at"::timestamp`,
    );
    await queryRunner.query(
      `ALTER TABLE "webauthn_credentials" ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at"::timestamp`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" ALTER COLUMN "deleted_at" TYPE TIMESTAMP USING "deleted_at"::timestamp`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" ALTER COLUMN "updated_at" TYPE TIMESTAMP USING "updated_at"::timestamp`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at"::timestamp`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ALTER COLUMN "deleted_at" TYPE TIMESTAMP USING "deleted_at"::timestamp`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ALTER COLUMN "updated_at" TYPE TIMESTAMP USING "updated_at"::timestamp`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at"::timestamp`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ALTER COLUMN "deleted_at" TYPE TIMESTAMP USING "deleted_at"::timestamp`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ALTER COLUMN "updated_at" TYPE TIMESTAMP USING "updated_at"::timestamp`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at"::timestamp`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "deleted_at" TYPE TIMESTAMP USING "deleted_at"::timestamp`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updated_at" TYPE TIMESTAMP USING "updated_at"::timestamp`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at"::timestamp`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "first_login_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "verified_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "state"`,
    );

    await queryRunner.query(
      `ALTER TABLE "roles" RENAME COLUMN "deleted_at" TO "deletedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" RENAME COLUMN "created_at" TO "createdAt"`,
    );

    await queryRunner.query(
      `ALTER TABLE "sessions" RENAME COLUMN "user_id" TO "userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" RENAME COLUMN "deleted_at" TO "deletedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" RENAME COLUMN "created_at" TO "createdAt"`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "role_id" TO "roleId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "deleted_at" TO "deletedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "updated_at" TO "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "created_at" TO "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "last_name" TO "lastName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "first_name" TO "firstName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "social_id" TO "socialId"`,
    );

    await queryRunner.query(
      `ALTER TABLE "role_permissions" RENAME TO "role_permission"`,
    );
    await queryRunner.query(`ALTER TABLE "sessions" RENAME TO "session"`);
    await queryRunner.query(`ALTER TABLE "permissions" RENAME TO "permission"`);
    await queryRunner.query(`ALTER TABLE "roles" RENAME TO "role"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME TO "user"`);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_3d2f174ef04fb312fdebd0ddc5" ON "session" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_f0e1b4ecdca13b177e2e3a0613" ON "user" ("lastName")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_58e4dbff0e1a32a9bdc861bb29" ON "user" ("firstName")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_9bd2fe7a8e694dedc4ec2f666f" ON "user" ("socialId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_webauthn_credentials_credential_id" ON "webauthn_credentials" ("credential_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_webauthn_credentials_user_id" ON "webauthn_credentials" ("user_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_c28e52f758e7bbc53828db92194" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "session" ADD CONSTRAINT "FK_3d2f174ef04fb312fdebd0ddc53" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "webauthn_credentials" ADD CONSTRAINT "FK_webauthn_credentials_user_id" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
