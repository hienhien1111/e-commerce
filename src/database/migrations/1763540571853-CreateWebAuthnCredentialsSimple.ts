import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWebAuthnCredentialsSimple1763540571853
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "webauthn_credentials" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "user_id" uuid NOT NULL,
                "credential_id" text NOT NULL UNIQUE,
                "public_key" text NOT NULL,
                "counter" bigint NOT NULL DEFAULT 0,
                "transports" jsonb,
                "backed_up" boolean NOT NULL DEFAULT false,
                "device_type" varchar(50),
                "aaguid" uuid,
                "created_at" timestamp NOT NULL DEFAULT now(),
                "last_used_at" timestamp,
                CONSTRAINT "FK_webauthn_credentials_user_id" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
            )
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_webauthn_credentials_user_id" ON "webauthn_credentials" ("user_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_webauthn_credentials_credential_id" ON "webauthn_credentials" ("credential_id")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "webauthn_credentials"`);
  }
}
