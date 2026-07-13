-- Checkpoint A: tồn kho listing và idempotency checkout.
-- Expand nullable trước để migration vẫn an toàn với dữ liệu hiện có.
ALTER TABLE "Listing"
ADD COLUMN "stock" INTEGER,
ADD COLUMN "soldAt" TIMESTAMP(3);

ALTER TABLE "Order"
ADD COLUMN "checkoutKey" TEXT;

-- Giá trị 1 chỉ là mặc định tương thích cho row cũ. Script backfill có report
-- sẽ thay bằng stock nguồn trên database test/rehearsal.
UPDATE "Listing"
SET "stock" = 1
WHERE "stock" IS NULL;

ALTER TABLE "Listing"
ALTER COLUMN "stock" SET DEFAULT 1,
ALTER COLUMN "stock" SET NOT NULL;

ALTER TABLE "Listing"
ADD CONSTRAINT "Listing_stock_non_negative" CHECK ("stock" >= 0);

CREATE INDEX "Listing_status_stock_idx" ON "Listing"("status", "stock");
CREATE UNIQUE INDEX "Order_buyerId_checkoutKey_key" ON "Order"("buyerId", "checkoutKey");
