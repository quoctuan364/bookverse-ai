-- Gold Catalog chỉ lưu metadata/provenance; không tạo listing, giá, stock hoặc hành vi người dùng.
CREATE TABLE "gold_catalog_records" (
    "catalogId" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "authors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "language" TEXT,
    "publisher" TEXT,
    "publishedDate" TEXT,
    "publishedYear" INTEGER,
    "isbn10" TEXT,
    "isbn13" TEXT,
    "pageCount" INTEGER,
    "sourceCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "canonicalCategoryKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "coverUrl" TEXT,
    "coverProvider" TEXT,
    "coverFinalUrl" TEXT,
    "coverWidth" INTEGER,
    "coverHeight" INTEGER,
    "coverHttpStatus" INTEGER,
    "coverContentType" TEXT,
    "coverTechnicalStatus" TEXT NOT NULL,
    "coverRightsStatus" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerBookId" TEXT,
    "providerWorkId" TEXT,
    "providerEditionId" TEXT,
    "sourceUrl" TEXT,
    "retrievedAt" TIMESTAMP(3) NOT NULL,
    "rawChecksum" TEXT,
    "normalizedChecksum" TEXT NOT NULL,
    "metadataQualityScore" INTEGER NOT NULL,
    "qualityTier" TEXT NOT NULL,
    "rejectionReasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gold_catalog_records_pkey" PRIMARY KEY ("catalogId")
);

CREATE UNIQUE INDEX "gold_catalog_records_provider_providerBookId_key" ON "gold_catalog_records"("provider", "providerBookId");
CREATE INDEX "gold_catalog_records_qualityTier_idx" ON "gold_catalog_records"("qualityTier");
CREATE INDEX "gold_catalog_records_language_idx" ON "gold_catalog_records"("language");
CREATE INDEX "gold_catalog_records_publishedYear_idx" ON "gold_catalog_records"("publishedYear");
