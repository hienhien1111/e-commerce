-- AlterTable
ALTER TABLE "carts" ADD COLUMN "coupon_id" UUID;

-- AlterTable
ALTER TABLE "coupons" ADD COLUMN "max_discount" DECIMAL(12,0);

-- CreateIndex
CREATE INDEX "carts_coupon_id_idx" ON "carts"("coupon_id");

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_coupon_id_fkey"
  FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
