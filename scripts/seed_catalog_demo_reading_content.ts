import { createHash } from "node:crypto";

import "dotenv/config";
import { EditionType, Prisma } from "@prisma/client";

import {
  buildDemoBookPages,
  DEMO_CONTENT_LABEL,
} from "../lib/demo-book-content";
import prisma from "../lib/prisma";

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

function stableChunkId(bookId: string, chapterNumber: number, chunkIndex: number): string {
  return `BV-DEMO-CATALOG-${bookId}-${String(chapterNumber).padStart(2, "0")}-${String(chunkIndex).padStart(2, "0")}`;
}

async function main(): Promise<void> {
  const execute = process.argv.includes("--execute");
  const refreshExisting = process.argv.includes("--refresh-existing");
  const databaseName = databaseNameFromUrl(process.env.DATABASE_URL);
  const confirmation = process.argv
    .find((argument) => argument.startsWith("--confirm-database="))
    ?.slice("--confirm-database=".length);

  if (execute && confirmation !== databaseName) {
    throw new Error(
      `Để ghi nội dung demo, thêm --execute --confirm-database=${databaseName}.`,
    );
  }

  const books = await prisma.book.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      ...(refreshExisting
        ? {
            chunks: {
              some: {
                id: { startsWith: "BV-DEMO-CATALOG-" },
              },
            },
          }
        : { chunks: { none: {} } }),
    },
    orderBy: { id: "asc" },
    select: {
      id: true,
      title: true,
      authorName: true,
      price: true,
      languageCode: true,
      category: { select: { name: true } },
    },
  });

  const prepared = books.map((book) => {
    const chunks = buildDemoBookPages({
        bookId: book.id,
        title: book.title,
        authorName: book.authorName,
        categoryName: book.category.name,
      }).map((page) => ({
        id: stableChunkId(book.id, page.chapterNumber, page.chunkIndex),
        bookId: book.id,
        chapterNumber: page.chapterNumber,
        chapterTitle: page.chapterTitle,
        pageNumber: page.pageNumber,
        chunkIndex: page.chunkIndex,
        content: page.content,
        embedding: {
          status: "NOT_REQUESTED",
          source: "BOOKVERSE_AUTHORED_DEMO",
          contentLabel: DEMO_CONTENT_LABEL,
        } satisfies Prisma.InputJsonValue,
      }));
    const plainText = chunks.map((chunk) => chunk.content).join("\n\n");
    return {
      book,
      chunks,
      plainText,
      fileHash: createHash("sha256").update(plainText).digest("hex"),
    };
  });

  if (execute) {
    for (const [index, item] of prepared.entries()) {
      const editionId = `BV-DEMO-READING-${item.book.id}`;
      await prisma.$transaction(async (tx) => {
        if (refreshExisting) {
          // Chỉ thay nội dung demo do script này tạo, không đụng vào dữ liệu sách gốc.
          await tx.bookChunk.deleteMany({
            where: {
              bookId: item.book.id,
              id: { startsWith: "BV-DEMO-CATALOG-" },
            },
          });
        }

        await tx.book.update({
          where: { id: item.book.id },
          data: { isEbook: true },
        });
        await tx.bookEdition.upsert({
          where: { id: editionId },
          update: {
            editionType: EditionType.EBOOK,
            stock: 999,
            languageCode: "vi",
            isActive: true,
          },
          create: {
            id: editionId,
            bookId: item.book.id,
            editionType: EditionType.EBOOK,
            price: item.book.price,
            stock: 999,
            languageCode: "vi",
            isActive: true,
          },
        });
        await tx.digitalAsset.upsert({
          where: { editionId },
          update: {
            fileUrl: `/read/${item.book.id}`,
            fileHash: item.fileHash,
            samplePages: Math.max(1, Math.floor(item.chunks.length * 0.1)),
            mimeType: "application/vnd.bookverse.demo-chunks+json",
            fileSize: Buffer.byteLength(item.plainText, "utf8"),
          },
          create: {
            id: `BV-DEMO-READING-ASSET-${item.book.id}`,
            editionId,
            fileUrl: `/read/${item.book.id}`,
            fileHash: item.fileHash,
            samplePages: Math.max(1, Math.floor(item.chunks.length * 0.1)),
            mimeType: "application/vnd.bookverse.demo-chunks+json",
            fileSize: Buffer.byteLength(item.plainText, "utf8"),
          },
        });
        await tx.bookChunk.createMany({
          data: item.chunks,
          skipDuplicates: true,
        });
      });

      if ((index + 1) % 100 === 0 || index + 1 === prepared.length) {
        console.log(`[demo-reading] Đã tạo ${index + 1}/${prepared.length} sách.`);
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: execute ? "execute" : "dry-run",
        databaseName,
        booksWithoutContent: prepared.length,
        chunksToCreate: prepared.reduce((sum, item) => sum + item.chunks.length, 0),
        chaptersPerBook: 8,
        chunksPerBook: 32,
        operation: refreshExisting ? "REFRESH_DEMO_ONLY" : "CREATE_MISSING_ONLY",
        contentLabel: DEMO_CONTENT_LABEL,
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
