import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDomainTables1765600000000 implements MigrationInterface {
  name = 'CreateDomainTables1765600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_profiles" (
        "id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "first_name" varchar,
        "last_name" varchar,
        "phone" varchar,
        "date_of_birth" date,
        "country" varchar,
        "address" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_profiles_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_user_profiles_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "trading_accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "provider" varchar NOT NULL,
        "account_number" varchar NOT NULL,
        "api_key_encrypted" varchar,
        "status" varchar NOT NULL DEFAULT 'pending',
        "currency" varchar NOT NULL DEFAULT 'USD',
        "last_equity" decimal(20,8) NOT NULL DEFAULT 0,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_trading_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trading_accounts_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_trading_accounts_user_id" ON "trading_accounts" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_trading_accounts_provider" ON "trading_accounts" ("provider")`,
    );

    await queryRunner.query(`
      CREATE TABLE "payment_accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "provider" varchar NOT NULL,
        "account_id" varchar NOT NULL,
        "currency" varchar NOT NULL DEFAULT 'USD',
        "status" varchar NOT NULL DEFAULT 'pending',
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_payment_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payment_accounts_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_accounts_user_id" ON "payment_accounts" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_accounts_provider" ON "payment_accounts" ("provider")`,
    );

    await queryRunner.query(`
      CREATE TABLE "accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "balance" decimal(20,8) NOT NULL DEFAULT 0,
        "currency" varchar NOT NULL DEFAULT 'VND',
        "status" varchar NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_accounts_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_accounts_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "kyc_verifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "provider" varchar NOT NULL DEFAULT 'vnpt_ekyc',
        "external_verification_id" varchar NOT NULL,
        "status" varchar NOT NULL DEFAULT 'pending',
        "rejection_reason" text,
        "confidence_score" decimal(5,4),
        "verified_at" TIMESTAMP WITH TIME ZONE,
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_kyc_verifications" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_kyc_verifications_external_id" UNIQUE ("external_verification_id"),
        CONSTRAINT "FK_kyc_verifications_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_kyc_verifications_user_id" ON "kyc_verifications" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_kyc_verifications_status" ON "kyc_verifications" ("status")`,
    );

    await queryRunner.query(`
      CREATE TABLE "kyc_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "kyc_verification_id" uuid NOT NULL,
        "session_token" varchar NOT NULL,
        "step" varchar NOT NULL,
        "session_data" jsonb,
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_kyc_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_kyc_sessions_verification_id" FOREIGN KEY ("kyc_verification_id") REFERENCES "kyc_verifications"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_kyc_sessions_verification_id" ON "kyc_sessions" ("kyc_verification_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "kyc_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "kyc_verification_id" uuid NOT NULL,
        "document_type" varchar NOT NULL,
        "id_number" varchar,
        "full_name" varchar,
        "date_of_birth" date,
        "gender" varchar,
        "nationality" varchar DEFAULT 'Việt Nam',
        "place_of_origin" varchar,
        "place_of_residence" varchar,
        "issue_date" date,
        "expiry_date" date,
        "chip_verified" boolean NOT NULL DEFAULT false,
        "c06_verified" boolean NOT NULL DEFAULT false,
        "ocr_accuracy_score" decimal(5,4),
        "authenticity_score" decimal(5,4),
        "face_match_score" decimal(5,4),
        "liveness_score" decimal(5,4),
        "raw_ocr_data" jsonb,
        "raw_nfc_data" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_kyc_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_kyc_documents_verification_id" FOREIGN KEY ("kyc_verification_id") REFERENCES "kyc_verifications"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_kyc_documents_verification_id" ON "kyc_documents" ("kyc_verification_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_kyc_documents_document_type" ON "kyc_documents" ("document_type")`,
    );

    await queryRunner.query(`
      CREATE TABLE "investment_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "type" varchar NOT NULL,
        "amount" decimal(20,8) NOT NULL,
        "currency" varchar NOT NULL,
        "investment_type" varchar,
        "status" varchar NOT NULL,
        "order_type" varchar,
        "external_reference_id" varchar,
        "trading_account_id" uuid,
        "payment_account_id" uuid,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "completed_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_investment_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_investment_history_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_investment_history_trading_account" FOREIGN KEY ("trading_account_id") REFERENCES "trading_accounts"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_investment_history_payment_account" FOREIGN KEY ("payment_account_id") REFERENCES "payment_accounts"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_investment_history_user_id" ON "investment_history" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_investment_history_type" ON "investment_history" ("type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_investment_history_status" ON "investment_history" ("status")`,
    );

    await queryRunner.query(`
      CREATE TABLE "portfolio_holdings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "symbol" varchar NOT NULL,
        "asset_name" varchar NOT NULL,
        "asset_type" varchar NOT NULL,
        "quantity" decimal(20,8) NOT NULL,
        "average_price" decimal(20,8) NOT NULL,
        "current_price" decimal(20,8),
        "total_cost" decimal(20,8) NOT NULL,
        "current_value" decimal(20,8) NOT NULL,
        "gain_loss" decimal(20,8) NOT NULL,
        "gain_loss_percentage" decimal(10,4) NOT NULL,
        "is_favorite" boolean NOT NULL DEFAULT false,
        "last_synced_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_portfolio_holdings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_portfolio_holdings_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_portfolio_holdings_user_id" ON "portfolio_holdings" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_portfolio_holdings_symbol" ON "portfolio_holdings" ("symbol")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_portfolio_holdings_user_symbol" ON "portfolio_holdings" ("user_id", "symbol")`,
    );

    await queryRunner.query(`
      CREATE TABLE "user_favorites" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "symbol" varchar NOT NULL,
        "added_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_favorites" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_favorites_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_user_favorites_user_id" ON "user_favorites" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_user_favorites_user_symbol" ON "user_favorites" ("user_id", "symbol")`,
    );

    await queryRunner.query(`
      CREATE TABLE "streaks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "description" text,
        "type" varchar NOT NULL,
        "duration" integer NOT NULL,
        "target_amount" decimal(20,8),
        "reward" jsonb,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_streaks" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_streak_progress" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "streak_id" uuid NOT NULL,
        "current_streak" integer NOT NULL DEFAULT 0,
        "total_invested" decimal(20,8) NOT NULL DEFAULT 0,
        "last_investment_date" date,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "reward_claimed" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_streak_progress" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_streak_progress_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_streak_progress_streak_id" FOREIGN KEY ("streak_id") REFERENCES "streaks"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_user_streak_progress_user_id" ON "user_streak_progress" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_streak_progress_streak_id" ON "user_streak_progress" ("streak_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_user_streak_progress_user_streak" ON "user_streak_progress" ("user_id", "streak_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "type" varchar NOT NULL,
        "title" varchar NOT NULL,
        "message" text NOT NULL,
        "data" jsonb,
        "is_read" boolean NOT NULL DEFAULT false,
        "read_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user_id" ON "notifications" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_is_read" ON "notifications" ("is_read")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_type" ON "notifications" ("type")`,
    );

    await queryRunner.query(`
      CREATE TABLE "bank_accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "bank_name" varchar NOT NULL,
        "account_number" varchar NOT NULL,
        "account_holder_name" varchar NOT NULL,
        "routing_number" varchar,
        "swift_code" varchar,
        "currency" varchar NOT NULL,
        "is_primary" boolean NOT NULL DEFAULT false,
        "is_verified" boolean NOT NULL DEFAULT false,
        "verified_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_bank_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_bank_accounts_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_bank_accounts_user_id" ON "bank_accounts" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "bank_accounts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_streak_progress"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "streaks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_favorites"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "portfolio_holdings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "investment_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "kyc_documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "kyc_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "kyc_verifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "accounts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_accounts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trading_accounts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_profiles"`);
  }
}
