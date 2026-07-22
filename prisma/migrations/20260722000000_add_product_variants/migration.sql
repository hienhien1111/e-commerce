-- Product variants become the source of truth for SKU, price and stock.
CREATE TABLE IF NOT EXISTS "product_variants" (
  "id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "label" TEXT,
  "sku" TEXT NOT NULL,
  "price" DECIMAL(12,0) NOT NULL,
  "compare_price" DECIMAL(12,0),
  "stock" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "image_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMPTZ,
  CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_variants_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "product_variants_image_id_fkey"
    FOREIGN KEY ("image_id") REFERENCES "product_images"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Historical records receive regular UUIDs during this one-time backfill;
-- application-created variants continue to use UUIDv7.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO "product_variants" (
  "id", "product_id", "label", "sku", "price", "compare_price", "stock", "is_active", "created_at", "updated_at", "deleted_at"
)
SELECT
  gen_random_uuid(), p."id", NULL,
  COALESCE(NULLIF(UPPER(BTRIM(p."sku")), ''), 'LEGACY-' || UPPER(REPLACE(p."id"::text, '-', ''))),
  p."price", p."compare_price", p."stock", p."is_active", p."created_at", p."updated_at", p."deleted_at"
FROM "products" p
WHERE NOT EXISTS (
  SELECT 1
  FROM "product_variants" existing
  WHERE existing."product_id" = p."id" AND existing."label" IS NULL
);

ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "variant_id" UUID;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "variant_id" UUID;

UPDATE "cart_items" ci
SET "variant_id" = pv."id"
FROM "product_variants" pv
WHERE pv."product_id" = ci."product_id" AND pv."label" IS NULL;

UPDATE "order_items" oi
SET "variant_id" = pv."id"
FROM "product_variants" pv
WHERE pv."product_id" = oi."product_id" AND pv."label" IS NULL;

ALTER TABLE "cart_items" ALTER COLUMN "variant_id" SET NOT NULL;
ALTER TABLE "order_items" ALTER COLUMN "variant_id" SET NOT NULL;

DROP INDEX IF EXISTS "cart_items_cart_id_product_id_key";
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_cart_id_variant_id_key') THEN
    ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_variant_id_key" UNIQUE ("cart_id", "variant_id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_variant_id_fkey') THEN
    ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_fkey"
      FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_variant_id_fkey') THEN
    ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey"
      FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "product_variants_product_id_idx" ON "product_variants"("product_id");
CREATE INDEX IF NOT EXISTS "product_variants_image_id_idx" ON "product_variants"("image_id");
CREATE INDEX IF NOT EXISTS "product_variants_product_id_is_active_idx" ON "product_variants"("product_id", "is_active");
CREATE INDEX IF NOT EXISTS "cart_items_variant_id_idx" ON "cart_items"("variant_id");
CREATE INDEX IF NOT EXISTS "order_items_variant_id_idx" ON "order_items"("variant_id");

-- A SKU/label can be reused after a variant is soft deleted, while active
-- records remain case-insensitively unique.
CREATE UNIQUE INDEX IF NOT EXISTS "product_variants_active_sku_unique"
  ON "product_variants" (LOWER("sku")) WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "product_variants_active_label_unique"
  ON "product_variants" ("product_id", LOWER("label"))
  WHERE "deleted_at" IS NULL AND "label" IS NOT NULL;

-- Product SKU is now represented by its default/effective variant.
UPDATE "products" SET "sku" = NULL;
