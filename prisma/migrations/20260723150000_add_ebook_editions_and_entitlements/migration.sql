-- CreateEnum
CREATE TYPE "EditionType" AS ENUM ('PAPER_NEW', 'PAPER_USED', 'EBOOK');

-- CreateTable
CREATE TABLE "book_editions" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "editionType" "EditionType" NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isbn" TEXT,
    "publisher" TEXT,
    "publishYear" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_editions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_assets" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "samplePages" INTEGER NOT NULL DEFAULT 10,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digital_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_entitlements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reading_entitlements_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "editionId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "editionId" TEXT;

-- CreateIndex
CREATE INDEX "book_editions_bookId_idx" ON "book_editions"("bookId");
CREATE INDEX "book_editions_editionType_isActive_idx" ON "book_editions"("editionType", "isActive");
CREATE INDEX "book_editions_bookId_editionType_idx" ON "book_editions"("bookId", "editionType");
CREATE UNIQUE INDEX "digital_assets_editionId_key" ON "digital_assets"("editionId");
CREATE INDEX "digital_assets_fileHash_idx" ON "digital_assets"("fileHash");
CREATE UNIQUE INDEX "reading_entitlements_userId_bookId_key" ON "reading_entitlements"("userId", "bookId");
CREATE INDEX "reading_entitlements_bookId_idx" ON "reading_entitlements"("bookId");
CREATE INDEX "Listing_editionId_idx" ON "Listing"("editionId");
CREATE INDEX "OrderItem_editionId_idx" ON "OrderItem"("editionId");

-- AddForeignKey
ALTER TABLE "book_editions"
ADD CONSTRAINT "book_editions_bookId_fkey"
FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "digital_assets"
ADD CONSTRAINT "digital_assets_editionId_fkey"
FOREIGN KEY ("editionId") REFERENCES "book_editions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reading_entitlements"
ADD CONSTRAINT "reading_entitlements_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reading_entitlements"
ADD CONSTRAINT "reading_entitlements_bookId_fkey"
FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Listing"
ADD CONSTRAINT "Listing_editionId_fkey"
FOREIGN KEY ("editionId") REFERENCES "book_editions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_editionId_fkey"
FOREIGN KEY ("editionId") REFERENCES "book_editions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
