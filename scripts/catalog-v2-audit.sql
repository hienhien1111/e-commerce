-- Read this report before validating Catalog V2 ownership FKs in production.
-- Run with: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/catalog-v2-audit.sql

\echo 'Active/archived SKU collisions (must be empty)'
SELECT LOWER("sku") AS sku, ARRAY_AGG("id" ORDER BY "id") AS variant_ids
FROM "product_variants"
GROUP BY LOWER("sku")
HAVING COUNT(*) > 1;

\echo 'Cart variant/product ownership mismatches (must be empty)'
SELECT ci."id", ci."cart_id", ci."product_id", ci."variant_id"
FROM "cart_items" ci
JOIN "product_variants" pv ON pv."id" = ci."variant_id"
WHERE ci."product_id" <> pv."product_id";

\echo 'Order variant/product ownership mismatches (must be empty)'
SELECT oi."id", oi."order_id", oi."product_id", oi."variant_id"
FROM "order_items" oi
JOIN "product_variants" pv ON pv."id" = oi."variant_id"
WHERE oi."product_id" <> pv."product_id";

\echo 'Variant media whose product ownership is invalid (must be empty)'
SELECT pvm.*
FROM "product_variant_media" pvm
JOIN "product_variants" pv ON pv."id" = pvm."variant_id"
JOIN "product_media" pm ON pm."id" = pvm."media_id"
WHERE pvm."product_id" <> pv."product_id"
   OR pvm."product_id" <> pm."product_id";

\echo 'Active variants without exactly one value for every option (must be empty)'
SELECT pv."id" AS variant_id, pv."product_id",
       COUNT(DISTINCT po."id") AS option_count,
       COUNT(pvov."value_id") AS selected_count
FROM "product_variants" pv
LEFT JOIN "product_options" po ON po."product_id" = pv."product_id"
LEFT JOIN "product_variant_option_values" pvov ON pvov."variant_id" = pv."id"
WHERE pv."status" = 'ACTIVE' AND pv."deleted_at" IS NULL
GROUP BY pv."id", pv."product_id"
HAVING COUNT(DISTINCT po."id") <> COUNT(pvov."value_id");

\echo 'Active products with no active variant (must be empty)'
SELECT p."id", p."slug"
FROM "products" p
WHERE p."status" = 'ACTIVE' AND p."deleted_at" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "product_variants" pv
    WHERE pv."product_id" = p."id"
      AND pv."status" = 'ACTIVE'
      AND pv."deleted_at" IS NULL
  );

\echo 'Inventory balance violations (must be empty)'
SELECT *
FROM "inventory_balances"
WHERE "on_hand" < 0 OR "reserved" < 0 OR "reserved" > "on_hand";

\echo 'Projection drift (rebuild or investigate rows returned)'
WITH source AS (
  SELECT p."id" AS product_id,
         COALESCE(SUM(GREATEST(ib."on_hand" - ib."reserved", 0)), 0)::integer AS available_quantity,
         COUNT(pv."id") FILTER (WHERE pv."status" = 'ACTIVE' AND pv."deleted_at" IS NULL)::integer AS sellable_variant_count
  FROM "products" p
  LEFT JOIN "product_variants" pv
    ON pv."product_id" = p."id" AND pv."status" = 'ACTIVE' AND pv."deleted_at" IS NULL
  LEFT JOIN "inventory_balances" ib ON ib."variant_id" = pv."id"
  GROUP BY p."id"
)
SELECT projection."product_id", projection."available_quantity", source.available_quantity,
       projection."sellable_variant_count", source.sellable_variant_count
FROM "product_catalog_projections" projection
JOIN source ON source.product_id = projection."product_id"
WHERE projection."available_quantity" <> source.available_quantity
   OR projection."sellable_variant_count" <> source.sellable_variant_count;

-- Run only after every report above is empty. VALIDATE takes a lighter lock
-- than ADD CONSTRAINT and does not block normal writes for its full scan.
-- ALTER TABLE "product_variant_option_values" VALIDATE CONSTRAINT "pvov_variant_product_owner_fkey";
-- ALTER TABLE "product_variant_option_values" VALIDATE CONSTRAINT "pvov_option_product_owner_fkey";
-- ALTER TABLE "product_variant_option_values" VALIDATE CONSTRAINT "pvov_value_option_owner_fkey";
-- ALTER TABLE "product_variant_media" VALIDATE CONSTRAINT "pvm_variant_product_owner_fkey";
-- ALTER TABLE "product_variant_media" VALIDATE CONSTRAINT "pvm_media_product_owner_fkey";
-- ALTER TABLE "cart_items" VALIDATE CONSTRAINT "cart_items_variant_product_owner_fkey";
-- ALTER TABLE "order_items" VALIDATE CONSTRAINT "order_items_variant_product_owner_fkey";
