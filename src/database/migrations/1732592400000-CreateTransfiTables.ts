import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTransfiTables1732592400000 implements MigrationInterface {
  name = 'CreateTransfiTables1732592400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create transfi_users table
    await queryRunner.query(`
      CREATE TABLE "transfi_users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "transfiUserId" character varying NOT NULL,
        "userType" character varying NOT NULL CHECK ("userType" IN ('individual', 'business')),
        "email" character varying NOT NULL,
        "firstName" character varying,
        "lastName" character varying,
        "companyName" character varying,
        "kycStatus" character varying NOT NULL DEFAULT 'not_submitted' CHECK ("kycStatus" IN ('pending', 'approved', 'rejected', 'under_review', 'not_submitted')),
        "kycLevel" integer NOT NULL DEFAULT 0,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_transfi_users_userId" UNIQUE ("userId"),
        CONSTRAINT "UQ_transfi_users_transfiUserId" UNIQUE ("transfiUserId"),
        CONSTRAINT "PK_transfi_users" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for transfi_users
    await queryRunner.query(`
      CREATE INDEX "IDX_transfi_users_userId" ON "transfi_users" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_transfi_users_transfiUserId" ON "transfi_users" ("transfiUserId")
    `);

    // Create transfi_orders table
    await queryRunner.query(`
      CREATE TABLE "transfi_orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "orderId" character varying NOT NULL,
        "externalOrderId" character varying,
        "transfiUserId" uuid NOT NULL,
        "orderType" character varying NOT NULL CHECK ("orderType" IN ('payin', 'payout')),
        "currencyType" character varying NOT NULL CHECK ("currencyType" IN ('fiat', 'crypto')),
        "sourceCurrency" character varying NOT NULL,
        "destinationCurrency" character varying NOT NULL,
        "sourceAmount" numeric(20,8) NOT NULL,
        "destinationAmount" numeric(20,8),
        "fee" numeric(20,8) NOT NULL DEFAULT 0,
        "rate" numeric(20,8),
        "paymentMethod" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
        "paymentUrl" text,
        "transactionHash" character varying,
        "failureReason" text,
        "callbackUrl" character varying,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "completedAt" TIMESTAMP,
        CONSTRAINT "UQ_transfi_orders_orderId" UNIQUE ("orderId"),
        CONSTRAINT "PK_transfi_orders" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for transfi_orders
    await queryRunner.query(`
      CREATE INDEX "IDX_transfi_orders_orderId" ON "transfi_orders" ("orderId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_transfi_orders_externalOrderId" ON "transfi_orders" ("externalOrderId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_transfi_orders_transfiUserId" ON "transfi_orders" ("transfiUserId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_transfi_orders_status" ON "transfi_orders" ("status")
    `);

    // Create foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "transfi_orders"
      ADD CONSTRAINT "FK_transfi_orders_transfiUserId"
      FOREIGN KEY ("transfiUserId")
      REFERENCES "transfi_users"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "transfi_orders"
      DROP CONSTRAINT "FK_transfi_orders_transfiUserId"
    `);

    // Drop transfi_orders table indexes
    await queryRunner.query(`DROP INDEX "IDX_transfi_orders_status"`);
    await queryRunner.query(`DROP INDEX "IDX_transfi_orders_transfiUserId"`);
    await queryRunner.query(`DROP INDEX "IDX_transfi_orders_externalOrderId"`);
    await queryRunner.query(`DROP INDEX "IDX_transfi_orders_orderId"`);

    // Drop transfi_orders table
    await queryRunner.query(`DROP TABLE "transfi_orders"`);

    // Drop transfi_users table indexes
    await queryRunner.query(`DROP INDEX "IDX_transfi_users_transfiUserId"`);
    await queryRunner.query(`DROP INDEX "IDX_transfi_users_userId"`);

    // Drop transfi_users table
    await queryRunner.query(`DROP TABLE "transfi_users"`);
  }
}
