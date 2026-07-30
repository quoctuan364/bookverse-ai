-- Lưu ảnh chụp danh sách sách của từng kỳ hội viên.
-- Nhờ đó, việc ngừng bán gói hoặc chỉnh kho sách không tước quyền đã thanh toán.
CREATE TABLE "subscription_book_accesses" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscription_book_accesses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_book_accesses_subscriptionId_bookId_key"
ON "subscription_book_accesses"("subscriptionId", "bookId");

CREATE INDEX "subscription_book_accesses_bookId_idx"
ON "subscription_book_accesses"("bookId");

ALTER TABLE "subscription_book_accesses"
ADD CONSTRAINT "subscription_book_accesses_subscriptionId_fkey"
FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscription_book_accesses"
ADD CONSTRAINT "subscription_book_accesses_bookId_fkey"
FOREIGN KEY ("bookId") REFERENCES "Book"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill cho thuê bao đã tồn tại trước migration.
INSERT INTO "subscription_book_accesses" ("id", "subscriptionId", "bookId", "createdAt")
SELECT
    CONCAT('sba_', md5(s."id" || ':' || mpb."A")),
    s."id",
    mpb."A",
    CURRENT_TIMESTAMP
FROM "subscriptions" s
JOIN "_MembershipPlanBooks" mpb ON mpb."B" = s."planId"
ON CONFLICT ("subscriptionId", "bookId") DO NOTHING;
