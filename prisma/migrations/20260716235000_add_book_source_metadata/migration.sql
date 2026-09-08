-- Additive metadata table for the curated Open Library catalog.
-- Existing Book rows and synthetic evaluation data are not rewritten by this migration.
CREATE TABLE "book_source_metadata" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "sourceProvider" TEXT NOT NULL,
    "sourceRecordKey" TEXT NOT NULL,
    "sourceRecordType" TEXT NOT NULL,
    "sourceWorkKey" TEXT,
    "sourceWorkKeyRaw" TEXT,
    "sourceEditionKey" TEXT,
    "sourcePageUrl" TEXT NOT NULL,
    "dataLabel" TEXT NOT NULL,
    "metadataQuality" TEXT NOT NULL,
    "coverId" TEXT,
    "coverRightsStatus" TEXT NOT NULL,
    "priceStatus" TEXT NOT NULL,
    "languageProfile" TEXT NOT NULL,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isbn" TEXT,
    "publisher" TEXT,
    "sourceFormat" TEXT NOT NULL,
    "descriptionStatus" TEXT NOT NULL,
    "sourceRatingStatus" TEXT NOT NULL,
    "sourceRatingAverage" DOUBLE PRECISION,
    "sourceRatingCount" INTEGER,
    "primarySourceCategoryId" TEXT NOT NULL,
    "primarySourceCategoryName" TEXT NOT NULL,
    "sourceCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isVietnameseEdition" BOOLEAN NOT NULL DEFAULT false,
    "authorNationality" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_source_metadata_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "book_source_metadata_bookId_key" ON "book_source_metadata"("bookId");
CREATE UNIQUE INDEX "book_source_metadata_isbn_key" ON "book_source_metadata"("isbn");
CREATE UNIQUE INDEX "book_source_metadata_sourceProvider_sourceRecordKey_key"
    ON "book_source_metadata"("sourceProvider", "sourceRecordKey");
CREATE UNIQUE INDEX "book_source_metadata_sourceProvider_sourceWorkKey_key"
    ON "book_source_metadata"("sourceProvider", "sourceWorkKey");
CREATE INDEX "book_source_metadata_sourceRecordType_idx" ON "book_source_metadata"("sourceRecordType");
CREATE INDEX "book_source_metadata_dataLabel_idx" ON "book_source_metadata"("dataLabel");
CREATE INDEX "book_source_metadata_languageProfile_idx" ON "book_source_metadata"("languageProfile");
CREATE INDEX "book_source_metadata_isVietnameseEdition_idx" ON "book_source_metadata"("isVietnameseEdition");
CREATE INDEX "book_source_metadata_primarySourceCategoryId_idx" ON "book_source_metadata"("primarySourceCategoryId");

ALTER TABLE "book_source_metadata"
    ADD CONSTRAINT "book_source_metadata_bookId_fkey"
    FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
