-- Commerce reservation/refund state and durable transactional outbox.

CREATE TYPE "ReservationStatus" AS ENUM (
  'PENDING',
  'RESERVED',
  'FAILED',
  'RELEASE_PENDING',
  'RELEASED'
);

CREATE TYPE "RefundStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED'
);

CREATE TYPE "OutboxStatus" AS ENUM (
  'PENDING',
  'PUBLISHED',
  'PROCESSING',
  'PROCESSED',
  'DEAD_LETTER'
);

ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUND_PENDING';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUND_FAILED';

ALTER TABLE "orders"
  ADD COLUMN "reservation_status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "reservation_expires_at" TIMESTAMPTZ,
  ADD COLUMN "cancellation_reason" TEXT,
  ADD COLUMN "paid_at" TIMESTAMPTZ;

UPDATE "orders"
SET
  "reservation_status" = CASE
    WHEN "status" = 'CANCELLED' THEN 'RELEASED'::"ReservationStatus"
    ELSE 'RESERVED'::"ReservationStatus"
  END,
  "reservation_expires_at" = CASE
    WHEN "payment_method" = 'MOMO'
      AND "payment_status" = 'PENDING'
      AND "status" <> 'CANCELLED'
    THEN "created_at" + INTERVAL '15 minutes'
    ELSE NULL
  END,
  "payment_status" = CASE
    WHEN "payment_method" = 'COD'
      AND "status" IN ('SHIPPED', 'DELIVERED')
    THEN 'PAID'::"PaymentStatus"
    ELSE "payment_status"
  END,
  "paid_at" = CASE
    WHEN "payment_method" = 'COD'
      AND "status" IN ('SHIPPED', 'DELIVERED')
    THEN "updated_at"
    WHEN "payment_status" = 'PAID'
    THEN "updated_at"
    ELSE NULL
  END;

-- Catalog V2 imported legacy variant stock as immediately available before the
-- saga state existed. Reconstruct the physical on-hand quantity and its held
-- portion only after the reservation columns are available.
WITH reserved AS (
  SELECT oi."variant_id", SUM(oi."quantity")::integer AS quantity
  FROM "order_items" oi
  JOIN "orders" o ON o."id" = oi."order_id"
  WHERE o."reservation_status" = 'RESERVED'
    AND o."status" <> 'CANCELLED'
  GROUP BY oi."variant_id"
)
UPDATE "inventory_balances" ib
SET
  "on_hand" = ib."on_hand" + reserved.quantity,
  "reserved" = reserved.quantity,
  "updated_at" = CURRENT_TIMESTAMP
FROM reserved
WHERE ib."variant_id" = reserved."variant_id"
  AND ib."warehouse_id" = '00000000-0000-7000-8000-000000000001'::uuid;

INSERT INTO "inventory_reservations" (
  "id", "order_id", "warehouse_id", "variant_id", "quantity", "status",
  "expires_at", "idempotency_key", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  oi."order_id",
  '00000000-0000-7000-8000-000000000001'::uuid,
  oi."variant_id",
  SUM(oi."quantity")::integer,
  'RESERVED'::"InventoryReservationStatus",
  o."reservation_expires_at",
  'legacy-reservation:' || oi."order_id"::text || ':' || oi."variant_id"::text,
  o."created_at",
  o."updated_at"
FROM "order_items" oi
JOIN "orders" o ON o."id" = oi."order_id"
WHERE o."reservation_status" = 'RESERVED'
  AND o."status" <> 'CANCELLED'
GROUP BY oi."order_id", oi."variant_id", o."reservation_expires_at", o."created_at", o."updated_at"
ON CONFLICT ("order_id", "warehouse_id", "variant_id") DO NOTHING;

INSERT INTO "inventory_movements" (
  "id", "event_id", "warehouse_id", "variant_id", "reservation_id", "order_id",
  "type", "quantity", "note"
)
SELECT
  gen_random_uuid(),
  'migration-reservation:' || ir."order_id"::text || ':' || ir."variant_id"::text,
  ir."warehouse_id",
  ir."variant_id",
  ir."id",
  ir."order_id",
  'RESERVATION'::"InventoryMovementType",
  ir."quantity",
  'Saga reservation backfill'
FROM "inventory_reservations" ir
WHERE ir."idempotency_key" LIKE 'legacy-reservation:%'
ON CONFLICT ("event_id") DO NOTHING;

CREATE TABLE "payment_refunds" (
  "id" UUID NOT NULL,
  "payment_id" UUID NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'momo',
  "amount" DECIMAL(12, 0) NOT NULL,
  "provider_trans_id" TEXT NOT NULL,
  "provider_refund_order_id" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "refund_trans_id" TEXT,
  "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "completed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,

  CONSTRAINT "payment_refunds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outbox_messages" (
  "id" UUID NOT NULL,
  "aggregate_type" TEXT NOT NULL,
  "aggregate_id" UUID NOT NULL,
  "event_type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "available_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "published_at" TIMESTAMPTZ,
  "processed_at" TIMESTAMPTZ,
  "last_error" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,

  CONSTRAINT "outbox_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_refunds_payment_id_key"
  ON "payment_refunds"("payment_id");
CREATE UNIQUE INDEX "payment_refunds_provider_refund_order_id_key"
  ON "payment_refunds"("provider_refund_order_id");
CREATE UNIQUE INDEX "payment_refunds_request_id_key"
  ON "payment_refunds"("request_id");
CREATE INDEX "payment_refunds_status_idx"
  ON "payment_refunds"("status");
CREATE INDEX "outbox_messages_status_available_at_idx"
  ON "outbox_messages"("status", "available_at");
CREATE INDEX "outbox_messages_aggregate_type_aggregate_id_idx"
  ON "outbox_messages"("aggregate_type", "aggregate_id");
CREATE INDEX "orders_reservation_status_idx"
  ON "orders"("reservation_status");
CREATE INDEX "orders_reservation_expires_at_idx"
  ON "orders"("reservation_expires_at");

ALTER TABLE "payment_refunds"
  ADD CONSTRAINT "payment_refunds_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "payments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Historical cancelled/paid MoMo transactions are reconciled automatically
-- after the dispatcher starts. The consumer queries MoMo before refunding.
INSERT INTO "outbox_messages" (
  "id",
  "aggregate_type",
  "aggregate_id",
  "event_type",
  "payload",
  "status",
  "available_at",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  'Payment',
  p."id",
  'RefundReconciliationRequested',
  jsonb_build_object(
    'paymentId', p."id",
    'orderId', p."order_id",
    'reason', 'HISTORICAL_CANCELLED_PAID'
  ),
  'PENDING'::"OutboxStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "payments" p
JOIN "orders" o ON o."id" = p."order_id"
WHERE o."status" = 'CANCELLED'
  AND p."status" = 'PAID'
  AND p."provider" = 'momo'
  AND p."provider_trans_id" IS NOT NULL;
