-- Bổ sung highlight cho chức năng đọc sách online.
CREATE TABLE "highlights" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "highlights_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "highlights_userId_bookId_idx" ON "highlights"("userId", "bookId");
CREATE INDEX "highlights_bookId_idx" ON "highlights"("bookId");

ALTER TABLE "highlights"
ADD CONSTRAINT "highlights_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "highlights"
ADD CONSTRAINT "highlights_bookId_fkey"
FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
