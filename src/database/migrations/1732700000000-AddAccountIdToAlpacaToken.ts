import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAccountIdToTradingToken1732700000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "alpaca_token" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "accessToken" text NOT NULL,
        "tokenType" character varying,
        "scope" character varying,
        "accountId" character varying,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_alpaca_token" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_alpaca_token_userId" ON "alpaca_token" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_alpaca_token_accountId" ON "alpaca_token" ("accountId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_alpaca_token_accountId"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_alpaca_token_userId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "alpaca_token"`);
  }
}
