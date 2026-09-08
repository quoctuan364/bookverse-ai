-- Lượt 1B: chỉ mở rộng Category bằng field nullable để giữ backward compatibility.
ALTER TABLE "Category"
  ADD COLUMN "parentId" TEXT,
  ADD COLUMN "level" INTEGER,
  ADD COLUMN "canonicalKey" TEXT,
  ADD COLUMN "canonicalName" TEXT;

CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");
CREATE INDEX "Category_canonicalKey_idx" ON "Category"("canonicalKey");
CREATE INDEX "Category_level_idx" ON "Category"("level");

ALTER TABLE "Category"
  ADD CONSTRAINT "Category_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Category"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
