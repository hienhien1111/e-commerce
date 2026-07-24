-- Catalog V2 hardening after the expand/backfill migration. These constraints
-- make the database, not just the application, the last line of defence.

-- The old v1 read indexes become redundant once catalog reads use the
-- projection and writes use (product_id, status, created_at).
DROP INDEX IF EXISTS "products_slug_idx";
DROP INDEX IF EXISTS "products_is_active_idx";
DROP INDEX IF EXISTS "product_variants_product_id_is_active_idx";

-- A SKU identifies a physical sellable unit for its entire lifetime. Keeping
-- archived rows in the global CI unique index makes re-use impossible; this
-- trigger also blocks mutation of an existing SKU.
CREATE OR REPLACE FUNCTION "catalog_v2_prevent_sku_mutation"() RETURNS trigger AS $$
BEGIN
  IF NEW."sku" IS DISTINCT FROM OLD."sku" THEN
    RAISE EXCEPTION 'SKU is immutable for product variant %', OLD."id"
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "catalog_v2_sku_immutable" ON "product_variants";
CREATE TRIGGER "catalog_v2_sku_immutable"
BEFORE UPDATE OF "sku" ON "product_variants"
FOR EACH ROW EXECUTE FUNCTION "catalog_v2_prevent_sku_mutation"();

-- The first migration asserted this invariant when Product itself changed.
-- Re-check it whenever a Variant changes too, otherwise archiving the final
-- active variant could leave an ACTIVE product with nothing sellable.
CREATE OR REPLACE FUNCTION "catalog_v2_assert_active_product_id"(target_product UUID) RETURNS void AS $$
DECLARE
  product_status "ProductStatus";
  product_deleted_at TIMESTAMPTZ;
BEGIN
  SELECT "status", "deleted_at"
  INTO product_status, product_deleted_at
  FROM "products"
  WHERE "id" = target_product;

  IF product_status IS NULL
    OR product_deleted_at IS NOT NULL
    OR product_status <> 'ACTIVE' THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "product_variants" pv
    WHERE pv."product_id" = target_product
      AND pv."deleted_at" IS NULL
      AND pv."status" = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Active product % must have an active variant', target_product
      USING ERRCODE = '23514';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "catalog_v2_assert_active_product"() RETURNS trigger AS $$
BEGIN
  PERFORM "catalog_v2_assert_active_product_id"(NEW."id");
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "catalog_v2_assert_active_product_from_variant"() RETURNS trigger AS $$
BEGIN
  PERFORM "catalog_v2_assert_active_product_id"(
    CASE WHEN TG_OP = 'DELETE' THEN OLD."product_id" ELSE NEW."product_id" END
  );
  IF TG_OP = 'UPDATE' AND OLD."product_id" IS DISTINCT FROM NEW."product_id" THEN
    PERFORM "catalog_v2_assert_active_product_id"(OLD."product_id");
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "catalog_v2_active_product" ON "products";
CREATE CONSTRAINT TRIGGER "catalog_v2_active_product"
AFTER INSERT OR UPDATE OF "status", "deleted_at" ON "products"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION "catalog_v2_assert_active_product"();

DROP TRIGGER IF EXISTS "catalog_v2_active_product_on_variant_change" ON "product_variants";
CREATE CONSTRAINT TRIGGER "catalog_v2_active_product_on_variant_change"
AFTER INSERT OR UPDATE OF "status", "deleted_at", "product_id" ON "product_variants"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION "catalog_v2_assert_active_product_from_variant"();

DROP TRIGGER IF EXISTS "catalog_v2_active_product_on_variant_delete" ON "product_variants";
CREATE CONSTRAINT TRIGGER "catalog_v2_active_product_on_variant_delete"
AFTER DELETE ON "product_variants"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION "catalog_v2_assert_active_product_from_variant"();
