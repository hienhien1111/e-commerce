-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'MOMO');

-- AlterTable
ALTER TABLE "orders"
  ADD COLUMN "payment_method" "PaymentMethod" NOT NULL DEFAULT 'COD';

-- Preserve the payment choice for historic orders created by the previous
-- MoMo-only checkout flow.
UPDATE "orders"
SET "payment_method" = 'MOMO'
WHERE EXISTS (
  SELECT 1
  FROM "payments"
  WHERE "payments"."order_id" = "orders"."id"
    AND "payments"."provider" = 'momo'
);
