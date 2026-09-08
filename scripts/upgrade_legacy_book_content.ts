import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";

import "dotenv/config";
import {
  BOOKVERSE_ORIGINAL_V2_CHAPTER_OFFSET,
  BOOKVERSE_ORIGINAL_V2_PREFIX,
} from "../lib/book-content-version";
import {
  buildDemoBookPages,
} from "../lib/demo-book-content";
import prisma from "../lib/prisma";

const BATCH_SIZE = 100;
const ORIGINAL_CONTENT_V2_LABEL = "NỘI_DUNG_NGUYÊN_BẢN_BOOKVERSE_V2";

function databaseNameFromUrl(databaseUrl?: string): string {
  if (!databaseUrl) throw new Error("Thiếu DATABASE_URL.");
  const parsed = new URL(databaseUrl);
  const databaseName = decodeURIComponent(
    parsed.pathname.replace(/^\/+/u, "").split("/")[0] ?? "",
  );
  if (!databaseName.startsWith("bookverse_")) {
    throw new Error(
      `Từ chối ghi database ngoài BookVerse: ${databaseName || "(trống)"}.`,
    );
  }
  return databaseName;
}

function readLimit(): number | null {
  const raw = process.argv
    .find((argument) => argument.startsWith("--limit="))
    ?.slice("--limit=".length);
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error("--limit phải là số nguyên dương.");
  }
  return value;
}

async function main(): Promise<void> {
  const execute = process.argv.includes("--execute");
  const databaseName = databaseNameFromUrl(process.env.DATABASE_URL);
  const confirmation = process.argv
    .find((argument) => argument.startsWith("--confirm-database="))
    ?.slice("--confirm-database=".length);
  const onlyBook = process.argv
    .find((argument) => argument.startsWith("--only-book="))
    ?.slice("--only-book=".length);
  const limit = readLimit();

  if (execute && confirmation !== databaseName) {
    throw new Error(
      `Để thêm nội dung v2, dùng --execute --confirm-database=${databaseName}.`,
    );
  }

  const books = await prisma.book.findMany({
    where: {
      id: onlyBook ? onlyBook : { startsWith: "B" },
      status: "ACTIVE",
      deletedAt: null,
    },
    orderBy: { id: "asc" },
    ...(limit ? { take: limit } : {}),
    select: {
      id: true,
      title: true,
      authorName: true,
      category: { select: { name: true } },
    },
  });

  const prepared = books.map((book) => {
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
      chapterNumber:
        BOOKVERSE_ORIGINAL_V2_CHAPTER_OFFSET + page.chapterNumber,
      chapterTitle: page.chapterTitle,
      pageNumber: page.pageNumber,
      chunkIndex: page.chunkIndex,
      content: page.content,
      embedding: {
        status: "NOT_REQUESTED",
        source: "BOOKVERSE_ORIGINAL_V2",
        contentLabel: ORIGINAL_CONTENT_V2_LABEL,
        contentHash,
      } satisfies Prisma.InputJsonValue,
    }));
  });

  let created = 0;
  if (execute) {
    for (let offset = 0; offset < prepared.length; offset += BATCH_SIZE) {
      const batch = prepared.slice(offset, offset + BATCH_SIZE).flat();
      const result = await prisma.bookChunk.createMany({
        data: batch,
        skipDuplicates: true,
      });
      created += result.count;
      console.log(
        `[original-v2] Đã xử lý ${Math.min(offset + BATCH_SIZE, prepared.length)}/${prepared.length} sách.`,
      );
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: execute ? "execute" : "dry-run",
        databaseName,
        books: books.length,
        chunksPrepared: prepared.reduce((sum, chunks) => sum + chunks.length, 0),
        chunksCreated: created,
        preservationPolicy:
          "ADDITIVE_ONLY_OLD_CHUNKS_AND_ORIGINAL_FILES_ARE_UNCHANGED",
        contentLabel: ORIGINAL_CONTENT_V2_LABEL,
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
