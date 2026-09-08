import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { BookStatus, EditionType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CHUNK_SIZE = 320;

function databaseNameFromUrl(databaseUrl?: string): string {
  if (!databaseUrl) throw new Error("Thiếu DATABASE_URL.");
  const parsed = new URL(databaseUrl);
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/u, "").split("/")[0] ?? "");
  if (!databaseName.startsWith("bookverse_")) {
    throw new Error(`Từ chối ghi vào database ngoài BookVerse: ${databaseName || "(trống)"}.`);
  }
  return databaseName;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/giu, " ")
    .replace(/<style[\s\S]*?<\/style>/giu, " ")
    .replace(/<\/(p|div|section|article|h1|h2|h3|li)>/giu, "\n")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&nbsp;/gu, " ")
    .replace(/&amp;/gu, "&")
    .replace(/[ \t]+/gu, " ")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  for (let offset = 0; offset < text.length; offset += CHUNK_SIZE) {
    const content = text.slice(offset, offset + CHUNK_SIZE).trim();
    if (content) chunks.push(content);
  }
  return chunks;
}

function ebookFileName(bookId: string): string {
  const numericId = bookId.replace(/^B/u, "");
  if (!/^\d{4}$/u.test(numericId)) {
    throw new Error(`Mã sách demo không hợp lệ: ${bookId}`);
  }
  return `book-${numericId}.html`;
}

async function main(): Promise<void> {
  const execute = process.argv.includes("--execute");
  const databaseName = databaseNameFromUrl(process.env.DATABASE_URL);
  const confirmation = process.argv
    .find((argument) => argument.startsWith("--confirm-database="))
    ?.slice("--confirm-database=".length);

  if (execute && confirmation !== databaseName) {
    throw new Error(
      `Để ghi dữ liệu Ebook, thêm --execute --confirm-database=${databaseName}.`,
    );
  }

  const books = await prisma.book.findMany({
    where: {
      id: { startsWith: "B" },
      status: BookStatus.ACTIVE,
      deletedAt: null,
    },
    orderBy: { id: "asc" },
    select: { id: true, price: true },
  });

  const prepared = [];
  for (const [index, book] of books.entries()) {
    const fileName = ebookFileName(book.id);
    const filePath = path.join(process.cwd(), "public", "ebooks", "html", fileName);
    const html = await readFile(filePath, "utf8");
    const chunks = splitIntoChunks(htmlToText(html));
    if (chunks.length < 2) throw new Error(`Nội dung ${fileName} quá ngắn.`);

    prepared.push({
      book,
      fileName,
      html,
      chunks,
      fileHash: createHash("sha256").update(html).digest("hex"),
    });

    if ((index + 1) % 250 === 0) {
      console.log(`[ebook-demo] Đã kiểm tra ${index + 1}/${books.length} file.`);
    }
  }

  if (execute) {
    for (const [index, item] of prepared.entries()) {
      const editionId = `BV-DEMO-EBOOK-${item.book.id}`;
      await prisma.$transaction(async (tx) => {
        await tx.book.update({
          where: { id: item.book.id },
          data: { isEbook: true },
        });
        await tx.bookEdition.upsert({
          where: { id: editionId },
          update: { isActive: true, stock: 999 },
          create: {
            id: editionId,
            bookId: item.book.id,
            editionType: EditionType.EBOOK,
            price: item.book.price,
            stock: 999,
            isActive: true,
          },
        });
        await tx.digitalAsset.upsert({
          where: { editionId },
          update: {
            fileUrl: item.fileName,
            fileHash: item.fileHash,
            samplePages: Math.max(1, Math.floor(item.chunks.length * 0.1)),
            mimeType: "text/html",
            fileSize: Buffer.byteLength(item.html),
          },
          create: {
            id: `BV-DEMO-ASSET-${item.book.id}`,
            editionId,
            fileUrl: item.fileName,
            fileHash: item.fileHash,
            samplePages: Math.max(1, Math.floor(item.chunks.length * 0.1)),
            mimeType: "text/html",
            fileSize: Buffer.byteLength(item.html),
          },
        });
        await tx.bookChunk.createMany({
          data: item.chunks.map((content, chunkIndex) => ({
            id: `BV-DEMO-CHUNK-${item.book.id}-${String(chunkIndex).padStart(3, "0")}`,
            bookId: item.book.id,
            chapterNumber: 1,
            chapterTitle: "Bản đọc BookVerse",
            pageNumber: chunkIndex + 1,
            chunkIndex,
            content,
            embedding: {
              status: "NOT_REQUESTED",
              source: "DEMO_HTML_LIBRARY",
            },
          })),
          skipDuplicates: true,
        });
      });

      if ((index + 1) % 100 === 0) {
        console.log(`[ebook-demo] Đã nhập ${index + 1}/${prepared.length} sách.`);
      }
    }
  }

  console.log(JSON.stringify({
    mode: execute ? "execute" : "dry-run",
    databaseName,
    books: prepared.length,
    chunks: prepared.reduce((sum, item) => sum + item.chunks.length, 0),
  }, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
