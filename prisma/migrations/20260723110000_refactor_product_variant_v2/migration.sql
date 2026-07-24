-- Online-expand phase for Catalog V2. Legacy product/image/variant columns are
-- intentionally retained; the destructive cleanup happens only after the v2
-- read/write cutover and the rollback window.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "ProductVariantStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
CREATE TYPE "InventoryReservationStatus" AS ENUM ('RESERVED', 'RELEASED', 'FULFILLED', 'EXPIRED');
CREATE TYPE "InventoryMovementType" AS ENUM ('OPENING_BALANCE', 'ADJUSTMENT', 'RESERVATION', 'RELEASE', 'FULFILLMENT', 'RETURN');

ALTER TABLE "products"
  ADD COLUMN "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "published_at" TIMESTAMPTZ;

UPDATE "products"
SET "status" = CASE
  WHEN "deleted_at" IS NOT NULL THEN 'ARCHIVED'::"ProductStatus"
  WHEN "is_active" THEN 'ACTIVE'::"ProductStatus"
  ELSE 'DRAFT'::"ProductStatus"
END,
"published_at" = CASE
  WHEN "is_active" AND "deleted_at" IS NULL THEN COALESCE("created_at", CURRENT_TIMESTAMP)
  ELSE NULL
END;

ALTER TABLE "product_variants"
  ADD COLUMN "status" "ProductVariantStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "combination_key" TEXT,
  ADD COLUMN "currency" VARCHAR(3) NOT NULL DEFAULT 'VND',
  ADD COLUMN "legacy_sku" TEXT;

UPDATE "product_variants"
SET "status" = CASE
  WHEN "deleted_at" IS NOT NULL THEN 'ARCHIVED'::"ProductVariantStatus"
  WHEN "is_active" THEN 'ACTIVE'::"ProductVariantStatus"
  ELSE 'INACTIVE'::"ProductVariantStatus"
END,
"combination_key" = CASE
  WHEN "label" IS NULL THEN 'DEFAULT'
  ELSE 'LEGACY:' || "id"::text
END;

ALTER TABLE "product_variants"
  ALTER COLUMN "combination_key" SET NOT NULL,
  ALTER COLUMN "combination_key" SET DEFAULT 'DEFAULT';

-- Active SKU collisions are impossible in the previous schema. Archived
-- collisions are preserved for audit and renamed before SKU becomes global.
WITH ranked AS (
  SELECT "id", "sku",
    ROW_NUMBER() OVER (
      PARTITION BY LOWER("sku")
      ORDER BY ("deleted_at" IS NULL) DESC, "created_at", "id"
    ) AS rank
  FROM "product_variants"
)
UPDATE "product_variants" pv
SET "legacy_sku" = pv."sku",
    "sku" = 'ARCHIVED-' || UPPER(REPLACE(pv."id"::text, '-', ''))
FROM ranked
WHERE ranked."id" = pv."id"
  AND ranked.rank > 1
  AND pv."deleted_at" IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "product_variants"
    GROUP BY LOWER("sku")
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Catalog V2 migration blocked: active SKU collision requires remediation';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "products"
    GROUP BY LOWER("slug")
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Catalog V2 migration blocked: case-insensitive slug collision requires remediation';
  END IF;
END $$;

DROP INDEX IF EXISTS "product_variants_active_sku_unique";
CREATE UNIQUE INDEX "product_variants_sku_ci_key" ON "product_variants" (LOWER("sku"));
CREATE UNIQUE INDEX "products_slug_ci_key" ON "products" (LOWER("slug"));
ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_id_product_id_key" UNIQUE ("id", "product_id"),
  ADD CONSTRAINT "product_variants_price_non_negative" CHECK ("price" >= 0) NOT VALID,
  ADD CONSTRAINT "product_variants_compare_price_valid" CHECK ("compare_price" IS NULL OR "compare_price" >= "price") NOT VALID,
  ADD CONSTRAINT "product_variants_currency_vnd" CHECK ("currency" = 'VND') NOT VALID;

CREATE TABLE "product_options" (
  "id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_options_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_options_id_product_id_key" UNIQUE ("id", "product_id"),
  CONSTRAINT "product_options_product_id_code_key" UNIQUE ("product_id", "code"),
  CONSTRAINT "product_options_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
);
CREATE INDEX "product_options_product_id_position_idx" ON "product_options" ("product_id", "position");

CREATE TABLE "product_option_values" (
  "id" UUID NOT NULL,
  "product_option_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_option_values_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_option_values_id_option_id_key" UNIQUE ("id", "product_option_id"),
  CONSTRAINT "product_option_values_option_id_code_key" UNIQUE ("product_option_id", "code"),
  CONSTRAINT "product_option_values_option_id_fkey" FOREIGN KEY ("product_option_id") REFERENCES "product_options"("id") ON DELETE CASCADE
);
CREATE INDEX "product_option_values_option_id_position_idx" ON "product_option_values" ("product_option_id", "position");

CREATE TABLE "product_variant_option_values" (
  "variant_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "option_id" UUID NOT NULL,
  "value_id" UUID NOT NULL,
  CONSTRAINT "product_variant_option_values_pkey" PRIMARY KEY ("variant_id", "option_id"),
  CONSTRAINT "pvov_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE,
  CONSTRAINT "pvov_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE,
  CONSTRAINT "pvov_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "product_options"("id") ON DELETE CASCADE,
  CONSTRAINT "pvov_value_id_fkey" FOREIGN KEY ("value_id") REFERENCES "product_option_values"("id") ON DELETE CASCADE,
  CONSTRAINT "pvov_variant_product_owner_fkey" FOREIGN KEY ("variant_id", "product_id") REFERENCES "product_variants"("id", "product_id") ON DELETE CASCADE NOT VALID,
  CONSTRAINT "pvov_option_product_owner_fkey" FOREIGN KEY ("option_id", "product_id") REFERENCES "product_options"("id", "product_id") ON DELETE CASCADE NOT VALID,
  CONSTRAINT "pvov_value_option_owner_fkey" FOREIGN KEY ("value_id", "option_id") REFERENCES "product_option_values"("id", "product_option_id") ON DELETE CASCADE NOT VALID
);
CREATE INDEX "pvov_value_id_variant_id_idx" ON "product_variant_option_values" ("value_id", "variant_id");
CREATE INDEX "pvov_product_id_option_id_idx" ON "product_variant_option_values" ("product_id", "option_id");

-- A free-form legacy label is intentionally represented as one opaque option;
-- splitting strings like "Black - L" would corrupt product data.
INSERT INTO "product_options" ("id", "product_id", "code", "name", "position")
SELECT gen_random_uuid(), p."id", 'LEGACY_VARIANT', 'Variant', 0
FROM "products" p
WHERE EXISTS (
  SELECT 1 FROM "product_variants" pv
  WHERE pv."product_id" = p."id"
  GROUP BY pv."product_id"
  HAVING COUNT(*) > 1 OR BOOL_OR(pv."label" IS NOT NULL)
)
ON CONFLICT ("product_id", "code") DO NOTHING;

INSERT INTO "product_option_values" ("id", "product_option_id", "code", "label", "position")
SELECT gen_random_uuid(), po."id", 'LEGACY-' || pv."id"::text,
  COALESCE(NULLIF(BTRIM(pv."label"), ''), 'Default'),
  ROW_NUMBER() OVER (PARTITION BY pv."product_id" ORDER BY pv."created_at", pv."id") - 1
FROM "product_variants" pv
JOIN "product_options" po
  ON po."product_id" = pv."product_id" AND po."code" = 'LEGACY_VARIANT'
ON CONFLICT ("product_option_id", "code") DO NOTHING;

INSERT INTO "product_variant_option_values" ("variant_id", "product_id", "option_id", "value_id")
SELECT pv."id", pv."product_id", po."id", pov."id"
FROM "product_variants" pv
JOIN "product_options" po
  ON po."product_id" = pv."product_id" AND po."code" = 'LEGACY_VARIANT'
JOIN "product_option_values" pov
  ON pov."product_option_id" = po."id" AND pov."code" = 'LEGACY-' || pv."id"::text
ON CONFLICT ("variant_id", "option_id") DO NOTHING;

UPDATE "product_variants" pv
SET "combination_key" = 'LEGACY:' || pov."value_id"::text
FROM "product_variant_option_values" pov
JOIN "product_options" po ON po."id" = pov."option_id"
WHERE pov."variant_id" = pv."id" AND po."code" = 'LEGACY_VARIANT';

WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "product_id", "combination_key"
    ORDER BY ("deleted_at" IS NULL) DESC, "created_at", "id"
  ) AS rank
  FROM "product_variants"
)
UPDATE "product_variants" pv
SET "combination_key" = 'ARCHIVED:' || pv."id"::text
FROM ranked
WHERE ranked."id" = pv."id" AND ranked.rank > 1 AND pv."deleted_at" IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "product_variants"
    WHERE "deleted_at" IS NULL
    GROUP BY "product_id", "combination_key"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Catalog V2 migration blocked: live variant combination collision requires remediation';
  END IF;
END $$;
ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_product_id_combination_key" UNIQUE ("product_id", "combination_key");

CREATE TABLE "product_media" (
  "id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "url" TEXT NOT NULL,
  "public_id" TEXT NOT NULL,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_media_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_media_id_product_id_key" UNIQUE ("id", "product_id"),
  CONSTRAINT "product_media_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
);
CREATE INDEX "product_media_product_id_sort_order_id_idx" ON "product_media" ("product_id", "sort_order", "id");
CREATE UNIQUE INDEX "product_media_one_primary_idx" ON "product_media" ("product_id") WHERE "is_primary";

INSERT INTO "product_media" ("id", "product_id", "url", "public_id", "is_primary", "sort_order", "created_at", "updated_at")
SELECT "id", "product_id", "url", "public_id", "is_primary", "sort_order", "created_at", "created_at"
FROM "product_images";

WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "product_id"
    ORDER BY "is_primary" DESC, "sort_order", "id"
  ) AS rank
  FROM "product_media"
)
UPDATE "product_media" media
SET "is_primary" = false
FROM ranked
WHERE ranked."id" = media."id" AND ranked.rank > 1 AND media."is_primary";

CREATE TABLE "product_variant_media" (
  "variant_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "media_id" UUID NOT NULL,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_variant_media_pkey" PRIMARY KEY ("variant_id", "media_id"),
  CONSTRAINT "pvm_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE,
  CONSTRAINT "pvm_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE,
  CONSTRAINT "pvm_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "product_media"("id") ON DELETE CASCADE,
  CONSTRAINT "pvm_variant_product_owner_fkey" FOREIGN KEY ("variant_id", "product_id") REFERENCES "product_variants"("id", "product_id") ON DELETE CASCADE NOT VALID,
  CONSTRAINT "pvm_media_product_owner_fkey" FOREIGN KEY ("media_id", "product_id") REFERENCES "product_media"("id", "product_id") ON DELETE CASCADE NOT VALID
);
CREATE INDEX "product_variant_media_product_id_variant_id_idx" ON "product_variant_media" ("product_id", "variant_id");
CREATE UNIQUE INDEX "product_variant_media_one_primary_idx" ON "product_variant_media" ("variant_id") WHERE "is_primary";

-- Cross-product legacy image references are cleared and must be remapped by an
-- admin; they cannot be represented safely in v2 ownership constraints.
UPDATE "product_variants" pv
SET "image_id" = NULL
FROM "product_images" pi
WHERE pv."image_id" = pi."id" AND pv."product_id" <> pi."product_id";

INSERT INTO "product_variant_media" ("variant_id", "product_id", "media_id", "is_primary")
SELECT pv."id", pv."product_id", pv."image_id", true
FROM "product_variants" pv
JOIN "product_media" pm ON pm."id" = pv."image_id" AND pm."product_id" = pv."product_id"
WHERE pv."image_id" IS NOT NULL
ON CONFLICT ("variant_id", "media_id") DO NOTHING;

CREATE TABLE "warehouses" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "warehouses_code_key" UNIQUE ("code")
);
INSERT INTO "warehouses" ("id", "code", "name", "is_default")
VALUES ('00000000-0000-7000-8000-000000000001', 'DEFAULT', 'Default warehouse', true);
CREATE UNIQUE INDEX "warehouses_one_default_idx" ON "warehouses" (("is_default")) WHERE "is_default";

CREATE TABLE "inventory_balances" (
  "warehouse_id" UUID NOT NULL,
  "variant_id" UUID NOT NULL,
  "on_hand" INTEGER NOT NULL DEFAULT 0,
  "reserved" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_balances_pkey" PRIMARY KEY ("warehouse_id", "variant_id"),
  CONSTRAINT "inventory_balances_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT,
  CONSTRAINT "inventory_balances_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT,
  CONSTRAINT "inventory_balances_quantity_valid" CHECK ("on_hand" >= 0 AND "reserved" >= 0 AND "reserved" <= "on_hand")
);
CREATE INDEX "inventory_balances_variant_id_idx" ON "inventory_balances" ("variant_id");

CREATE TABLE "inventory_reservations" (
  "id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "warehouse_id" UUID NOT NULL,
  "variant_id" UUID NOT NULL,
  "quantity" INTEGER NOT NULL,
  "status" "InventoryReservationStatus" NOT NULL DEFAULT 'RESERVED',
  "expires_at" TIMESTAMPTZ,
  "idempotency_key" TEXT NOT NULL,
  "released_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_reservations_order_warehouse_variant_key" UNIQUE ("order_id", "warehouse_id", "variant_id"),
  CONSTRAINT "inventory_reservations_idempotency_key_key" UNIQUE ("idempotency_key"),
  CONSTRAINT "inventory_reservations_quantity_valid" CHECK ("quantity" > 0),
  CONSTRAINT "inventory_reservations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT,
  CONSTRAINT "inventory_reservations_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT,
  CONSTRAINT "inventory_reservations_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT
);
CREATE INDEX "inventory_reservations_status_expires_at_idx" ON "inventory_reservations" ("status", "expires_at");
CREATE INDEX "inventory_reservations_variant_id_status_idx" ON "inventory_reservations" ("variant_id", "status");

CREATE TABLE "inventory_movements" (
  "id" UUID NOT NULL,
  "event_id" TEXT NOT NULL,
  "warehouse_id" UUID NOT NULL,
  "variant_id" UUID NOT NULL,
  "reservation_id" UUID,
  "order_id" UUID,
  "type" "InventoryMovementType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_movements_event_id_key" UNIQUE ("event_id"),
  CONSTRAINT "inventory_movements_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT,
  CONSTRAINT "inventory_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT,
  CONSTRAINT "inventory_movements_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "inventory_reservations"("id") ON DELETE RESTRICT,
  CONSTRAINT "inventory_movements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT,
  CONSTRAINT "inventory_movements_quantity_non_zero" CHECK ("quantity" <> 0)
);
CREATE INDEX "inventory_movements_variant_id_created_at_idx" ON "inventory_movements" ("variant_id", "created_at");
CREATE INDEX "inventory_movements_order_id_idx" ON "inventory_movements" ("order_id");

-- Existing stock represents available stock because the legacy reservation
-- worker decremented it. Reconstruct on_hand by adding still-reserved lines.
INSERT INTO "inventory_balances" ("warehouse_id", "variant_id", "on_hand", "reserved")
SELECT
  '00000000-0000-7000-8000-000000000001'::uuid,
  pv."id",
  pv."stock" + COALESCE(reserved.quantity, 0),
  COALESCE(reserved.quantity, 0)
FROM "product_variants" pv
LEFT JOIN (
  SELECT oi."variant_id", SUM(oi."quantity")::integer AS quantity
  FROM "order_items" oi
  JOIN "orders" o ON o."id" = oi."order_id"
  WHERE o."reservation_status" = 'RESERVED'
    AND o."status" <> 'CANCELLED'
  GROUP BY oi."variant_id"
) reserved ON reserved."variant_id" = pv."id";

INSERT INTO "inventory_reservations" (
  "id", "order_id", "warehouse_id", "variant_id", "quantity", "status", "expires_at", "idempotency_key", "created_at", "updated_at"
)
SELECT gen_random_uuid(), oi."order_id", '00000000-0000-7000-8000-000000000001'::uuid,
  oi."variant_id", SUM(oi."quantity")::integer, 'RESERVED', o."reservation_expires_at",
  'legacy-reservation:' || oi."order_id"::text || ':' || oi."variant_id"::text,
  o."created_at", o."updated_at"
FROM "order_items" oi
JOIN "orders" o ON o."id" = oi."order_id"
WHERE o."reservation_status" = 'RESERVED' AND o."status" <> 'CANCELLED'
GROUP BY oi."order_id", oi."variant_id", o."reservation_expires_at", o."created_at", o."updated_at";

INSERT INTO "inventory_movements" ("id", "event_id", "warehouse_id", "variant_id", "type", "quantity", "note")
SELECT gen_random_uuid(), 'migration-opening:' || ib."variant_id"::text,
  ib."warehouse_id", ib."variant_id", 'OPENING_BALANCE', ib."on_hand", 'Catalog V2 opening balance'
FROM "inventory_balances" ib;

-- Repair old independent references before adding pair constraints. Order
-- history follows the actual Variant SKU and keeps its immutable snapshot.
UPDATE "cart_items" ci
SET "product_id" = pv."product_id"
FROM "product_variants" pv
WHERE ci."variant_id" = pv."id" AND ci."product_id" <> pv."product_id";
UPDATE "order_items" oi
SET "product_id" = pv."product_id"
FROM "product_variants" pv
WHERE oi."variant_id" = pv."id" AND oi."product_id" <> pv."product_id";

ALTER TABLE "cart_items"
  ADD CONSTRAINT "cart_items_variant_product_owner_fkey"
  FOREIGN KEY ("variant_id", "product_id") REFERENCES "product_variants"("id", "product_id") NOT VALID;
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_variant_product_owner_fkey"
  FOREIGN KEY ("variant_id", "product_id") REFERENCES "product_variants"("id", "product_id") NOT VALID;

CREATE TABLE "product_catalog_projections" (
  "product_id" UUID NOT NULL,
  "category_id" UUID,
  "status" "ProductStatus" NOT NULL,
  "published_at" TIMESTAMPTZ NOT NULL,
  "price_min" DECIMAL(12,0) NOT NULL,
  "price_max" DECIMAL(12,0) NOT NULL,
  "price_range" numrange GENERATED ALWAYS AS (numrange("price_min", "price_max", '[]')) STORED,
  "available_quantity" INTEGER NOT NULL DEFAULT 0,
  "sellable_variant_count" INTEGER NOT NULL DEFAULT 0,
  "primary_media_url" TEXT,
  "search_text" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_catalog_projections_pkey" PRIMARY KEY ("product_id"),
  CONSTRAINT "product_catalog_projections_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE,
  CONSTRAINT "product_catalog_projections_price_valid" CHECK ("price_min" >= 0 AND "price_max" >= "price_min"),
  CONSTRAINT "product_catalog_projections_available_valid" CHECK ("available_quantity" >= 0)
);
CREATE INDEX "catalog_projection_public_category_idx" ON "product_catalog_projections" ("category_id", "published_at" DESC, "product_id" DESC) WHERE "status" = 'ACTIVE';
CREATE INDEX "catalog_projection_public_idx" ON "product_catalog_projections" ("published_at" DESC, "product_id" DESC) WHERE "status" = 'ACTIVE';
CREATE INDEX "catalog_projection_price_range_idx" ON "product_catalog_projections" USING GIST ("price_range");
CREATE INDEX "catalog_projection_search_idx" ON "product_catalog_projections" USING GIN ("search_text" gin_trgm_ops);
CREATE INDEX "catalog_projection_available_idx" ON "product_catalog_projections" ("category_id", "published_at" DESC, "product_id" DESC) WHERE "status" = 'ACTIVE' AND "available_quantity" > 0;

INSERT INTO "product_catalog_projections" (
  "product_id", "category_id", "status", "published_at", "price_min", "price_max",
  "available_quantity", "sellable_variant_count", "primary_media_url", "search_text"
)
SELECT p."id", p."category_id", p."status", COALESCE(p."published_at", p."created_at"),
  COALESCE(v."price_min", p."price"), COALESCE(v."price_max", p."price"),
  COALESCE(v."available_quantity", 0), COALESCE(v."variant_count", 0),
  media."url", LOWER(CONCAT_WS(' ', p."name", p."slug"))
FROM "products" p
LEFT JOIN LATERAL (
  SELECT MIN(pv."price") AS price_min, MAX(pv."price") AS price_max,
    SUM(GREATEST(ib."on_hand" - ib."reserved", 0))::integer AS available_quantity,
    COUNT(*)::integer AS variant_count
  FROM "product_variants" pv
  LEFT JOIN "inventory_balances" ib
    ON ib."variant_id" = pv."id" AND ib."warehouse_id" = '00000000-0000-7000-8000-000000000001'::uuid
  WHERE pv."product_id" = p."id" AND pv."deleted_at" IS NULL AND pv."status" = 'ACTIVE'
) v ON true
LEFT JOIN LATERAL (
  SELECT pm."url"
  FROM "product_media" pm
  WHERE pm."product_id" = p."id"
  ORDER BY pm."is_primary" DESC, pm."sort_order", pm."id"
  LIMIT 1
) media ON true;

-- Deferred invariants protect ownership and option completeness after the
-- backfill. Validation of NOT VALID FKs is deliberately a later online step.
CREATE OR REPLACE FUNCTION "catalog_v2_assert_variant_options_for"(target_variant UUID) RETURNS void AS $$
DECLARE
  target_product UUID;
  option_count INTEGER;
  selected_count INTEGER;
  variant_status "ProductVariantStatus";
BEGIN
  SELECT "product_id", "status" INTO target_product, variant_status
  FROM "product_variants" WHERE "id" = target_variant;
  IF target_product IS NULL OR variant_status <> 'ACTIVE' THEN RETURN; END IF;
  SELECT COUNT(*) INTO option_count FROM "product_options" WHERE "product_id" = target_product;
  SELECT COUNT(*) INTO selected_count FROM "product_variant_option_values" WHERE "variant_id" = target_variant;
  IF option_count <> selected_count THEN
    RAISE EXCEPTION 'Active variant % must select exactly one value for every product option', target_variant;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "catalog_v2_assert_variant_options_from_variant"() RETURNS trigger AS $$
BEGIN
  PERFORM "catalog_v2_assert_variant_options_for"(COALESCE(NEW."id", OLD."id"));
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "catalog_v2_assert_variant_options_from_value"() RETURNS trigger AS $$
BEGIN
  PERFORM "catalog_v2_assert_variant_options_for"(COALESCE(NEW."variant_id", OLD."variant_id"));
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "catalog_v2_variant_options_on_variant"
AFTER INSERT OR UPDATE OF "status", "product_id" ON "product_variants"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "catalog_v2_assert_variant_options_from_variant"();
CREATE CONSTRAINT TRIGGER "catalog_v2_variant_options_on_value"
AFTER INSERT OR UPDATE OR DELETE ON "product_variant_option_values"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "catalog_v2_assert_variant_options_from_value"();

CREATE OR REPLACE FUNCTION "catalog_v2_assert_active_product"() RETURNS trigger AS $$
BEGIN
  IF NEW."status" = 'ACTIVE' AND NEW."deleted_at" IS NULL AND NOT EXISTS (
    SELECT 1 FROM "product_variants" pv
    WHERE pv."product_id" = NEW."id" AND pv."deleted_at" IS NULL AND pv."status" = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Active product % must have an active variant', NEW."id";
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER "catalog_v2_active_product"
AFTER INSERT OR UPDATE OF "status", "deleted_at" ON "products"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "catalog_v2_assert_active_product"();
