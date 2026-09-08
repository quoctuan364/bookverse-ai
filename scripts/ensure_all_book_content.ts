import { createHash } from "node:crypto";

import { Prisma } from "@prisma/client";
import "dotenv/config";

import {
  BOOKVERSE_ORIGINAL_V2_CHAPTER_OFFSET,
  BOOKVERSE_ORIGINAL_V2_PAGE_COUNT,
  BOOKVERSE_ORIGINAL_V2_PREFIX,
} from "../lib/book-content-version";
import { buildDemoBookPages } from "../lib/demo-book-content";
import prisma from "../lib/prisma";

const BATCH_SIZE = 100;
const CONTENT_LABEL = "NỘI_DUNG_NGUYÊN_BẢN_BOOKVERSE_V2";

function databaseNameFromUrl(databaseUrl?: string): string {
  if (!databaseUrl) throw new Error("Thiếu DATABASE_URL.");
  const parsed = new URL(databaseUrl);
  const databaseName = decodeURIComponent(
    parsed.pathname.replace(/^\/+/u, "").split("/")[0] ?? "",
  );
  if (!databaseName.startsWith("bookverse_")) {
    throw new Error(`Từ chối ghi database ngoài BookVerse: ${databaseName || "(trống)"}.`);
  }
  return databaseName;
}

function readLimit(): number | null {
  const raw = process.argv
    .find((argument) => argument.startsWith("--limit="))
    ?.slice("--limit=".length);
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) throw new Error("--limit phải là số nguyên dương.");
  return value;
}

async function main(): Promise<void> {
  const execute = process.argv.includes("--execute");
  const databaseName = databaseNameFromUrl(process.env.DATABASE_URL);
  const confirmation = process.argv
    .find((argument) => argument.startsWith("--confirm-database="))
    ?.slice("--confirm-database=".length);
  const limit = readLimit();

  if (execute && confirmation !== databaseName) {
    throw new Error(
      `Để thêm nội dung, dùng --execute --confirm-database=${databaseName}.`,
    );
  }

  const books = await prisma.book.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    orderBy: { id: "asc" },
    ...(limit ? { take: limit } : {}),
    select: {
      id: true,
      title: true,
      authorName: true,
      category: { select: { name: true } },
      chunks: {
        where: { id: { startsWith: BOOKVERSE_ORIGINAL_V2_PREFIX } },
        select: { id: true },
      },
    },
  });

  const incompleteBooks = books.filter(
    (book) => book.chunks.length < BOOKVERSE_ORIGINAL_V2_PAGE_COUNT,
  );
  const prepared = incompleteBooks.map((book) => {
    const pages = buildDemoBookPages({
      bookId: book.id,
      title: book.title,
      authorName: book.authorName,
      categoryName: book.category.name,
    });
    const contentHash = createHash("sha256")
      .update(pages.map((page) => page.content).join("\n\n"))
      .digest("hex");

    return pages.map((page) => ({
      id: `${BOOKVERSE_ORIGINAL_V2_PREFIX}${book.id}-${String(page.pageNumber).padStart(3, "0")}`,
      bookId: book.id,
      chapterNumber: BOOKVERSE_ORIGINAL_V2_CHAPTER_OFFSET + page.chapterNumber,
      chapterTitle: page.chapterTitle,
      pageNumber: page.pageNumber,
      chunkIndex: page.chunkIndex,
      content: page.content,
      embedding: {
        status: "NOT_REQUESTED",
        source: "BOOKVERSE_ORIGINAL_V2",
        contentLabel: CONTENT_LABEL,
        contentHash,
      } satisfies Prisma.InputJsonValue,
    }));
  });

  let chunksCreated = 0;
  if (execute) {
    for (let offset = 0; offset < prepared.length; offset += BATCH_SIZE) {
      const batch = prepared.slice(offset, offset + BATCH_SIZE).flat();
      const result = await prisma.bookChunk.createMany({ data: batch, skipDuplicates: true });
      chunksCreated += result.count;
      console.log(
        `[content-v2] Đã xử lý ${Math.min(offset + BATCH_SIZE, prepared.length)}/${prepared.length} sách.`,
      );
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: execute ? "execute" : "dry-run",
        databaseName,
        activeBooksChecked: books.length,
        booksAlreadyComplete: books.length - incompleteBooks.length,
        booksPrepared: incompleteBooks.length,
        chunksPrepared: prepared.reduce((sum, chunks) => sum + chunks.length, 0),
        chunksCreated,
        chaptersPerBook: 8,
        pagesPerBook: BOOKVERSE_ORIGINAL_V2_PAGE_COUNT,
        preservationPolicy: "ADDITIVE_ONLY_EXISTING_CONTENT_IS_UNCHANGED",
        contentLabel: CONTENT_LABEL,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
