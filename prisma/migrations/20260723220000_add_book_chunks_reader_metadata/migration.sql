-- CreateEnum
CREATE TYPE "HighlightColor" AS ENUM ('YELLOW', 'GREEN', 'PINK');

-- AlterTable
ALTER TABLE "ReadingProgress"
ADD COLUMN "currentChapter" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "highlights"
ADD COLUMN "color" "HighlightColor" NOT NULL DEFAULT 'YELLOW';

-- CreateTable
CREATE TABLE "book_chunks" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "chapterTitle" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "book_chunks_bookId_chapterNumber_chunkIndex_key"
ON "book_chunks"("bookId", "chapterNumber", "chunkIndex");

-- CreateIndex
CREATE INDEX "book_chunks_bookId_chapterNumber_idx"
ON "book_chunks"("bookId", "chapterNumber");

-- CreateIndex
CREATE INDEX "book_chunks_bookId_pageNumber_idx"
ON "book_chunks"("bookId", "pageNumber");

-- AddForeignKey
ALTER TABLE "book_chunks"
ADD CONSTRAINT "book_chunks_bookId_fkey"
FOREIGN KEY ("bookId") REFERENCES "Book"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
