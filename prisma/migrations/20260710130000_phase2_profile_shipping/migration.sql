ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "dailyReadingGoalMinutes" INTEGER;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "dailyReadingGoalPages" INTEGER;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingFullName" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingPhone" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingProvince" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingDistrict" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingWard" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingAddressLine" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingNote" TEXT;

CREATE TABLE IF NOT EXISTS "shipping_addresses" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "province" TEXT NOT NULL,
  "district" TEXT NOT NULL,
  "ward" TEXT NOT NULL,
  "addressLine" TEXT NOT NULL,
  "note" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "shipping_addresses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "favorite_books" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "favorite_books_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "shipping_addresses"
  ADD CONSTRAINT "shipping_addresses_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "favorite_books"
  ADD CONSTRAINT "favorite_books_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "favorite_books"
  ADD CONSTRAINT "favorite_books_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "shipping_addresses_userId_isDefault_idx" ON "shipping_addresses"("userId", "isDefault");
CREATE INDEX IF NOT EXISTS "shipping_addresses_userId_createdAt_idx" ON "shipping_addresses"("userId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "favorite_books_userId_bookId_key" ON "favorite_books"("userId", "bookId");
CREATE INDEX IF NOT EXISTS "favorite_books_bookId_idx" ON "favorite_books"("bookId");
