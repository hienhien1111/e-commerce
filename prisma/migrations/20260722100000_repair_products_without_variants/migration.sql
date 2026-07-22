-- Repair products created while the ProductVariant rollout was in progress.
-- A Product aggregate must always have one live variant. This is idempotent,
-- so it is safe for existing databases as well as fresh deployments.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO "product_variants" (
  "id", "product_id", "label", "sku", "price", "compare_price", "stock", "is_active", "created_at", "updated_at", "deleted_at"
)
SELECT
  gen_random_uuid(),
  p."id",
  NULL,
  CASE
    WHEN NULLIF(BTRIM(p."sku"), '') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "product_variants" used_sku
        WHERE used_sku."deleted_at" IS NULL
          AND LOWER(used_sku."sku") = LOWER(BTRIM(p."sku"))
      )
      THEN UPPER(BTRIM(p."sku"))
    ELSE 'LEGACY-' || UPPER(REPLACE(p."id"::text, '-', ''))
  END,
  p."price",
  p."compare_price",
  p."stock",
  p."is_active",
  p."created_at",
  p."updated_at",
  NULL
FROM "products" p
WHERE p."deleted_at" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "product_variants" existing
    WHERE existing."product_id" = p."id"
      AND existing."deleted_at" IS NULL
  );

-- SKU is owned by ProductVariant. Clear any legacy product-level value after
-- a repaired variant is in place, avoiding a second uniqueness source.
UPDATE "products" p
SET "sku" = NULL
WHERE p."sku" IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM "product_variants" variant
    WHERE variant."product_id" = p."id"
      AND variant."deleted_at" IS NULL
  );
