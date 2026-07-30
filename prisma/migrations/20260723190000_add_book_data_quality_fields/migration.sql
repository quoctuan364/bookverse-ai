CREATE TYPE "CoverReviewStatus" AS ENUM ('VERIFIED_LOCAL', 'NEEDS_COVER_REVIEW');

ALTER TABLE "Book"
ADD COLUMN "languageCode" TEXT,
ADD COLUMN "coverReviewStatus" "CoverReviewStatus" NOT NULL DEFAULT 'NEEDS_COVER_REVIEW',
ADD COLUMN "isPubliclyVisible" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "book_editions"
ADD COLUMN "languageCode" TEXT;

CREATE INDEX "Book_languageCode_idx" ON "Book"("languageCode");
CREATE INDEX "Book_coverReviewStatus_isPubliclyVisible_idx"
ON "Book"("coverReviewStatus", "isPubliclyVisible");
CREATE INDEX "book_editions_languageCode_idx" ON "book_editions"("languageCode");
