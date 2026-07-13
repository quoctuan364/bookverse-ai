CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "book_embeddings" (
  "id" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "embedding" vector NOT NULL,
  "model" TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "book_embeddings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "book_embeddings_bookId_key" ON "book_embeddings"("bookId");
CREATE INDEX IF NOT EXISTS "book_embeddings_bookId_idx" ON "book_embeddings"("bookId");

DO $$
BEGIN
  ALTER TABLE "book_embeddings"
  ADD CONSTRAINT "book_embeddings_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "highlights" ADD COLUMN IF NOT EXISTS "blockId" TEXT;
ALTER TABLE "highlights" ADD COLUMN IF NOT EXISTS "startOffset" INTEGER;
ALTER TABLE "highlights" ADD COLUMN IF NOT EXISTS "endOffset" INTEGER;

CREATE INDEX IF NOT EXISTS "highlights_bookId_blockId_idx" ON "highlights"("bookId", "blockId");
