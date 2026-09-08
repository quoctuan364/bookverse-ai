import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  EditionType,
  ListingCondition,
  ListingStatus,
  Prisma,
  PrismaClient,
  UserRole,
} from "@prisma/client";

import {
  buildCatalogListingDescription,
  catalogListingId,
  catalogPaperEditionId,
  CATALOG_STORE_EMAIL,
  CATALOG_STORE_NAME,
  CATALOG_STORE_USER_ID,
  EXPECTED_REAL_CATALOG_BOOKS,
  normalizeCatalogListingPrice,
  stableCatalogStock,
} from "@/lib/catalog-listing-sync";

type SyncMode = "dry-run" | "execute";

interface SyncOptions {
  mode: SyncMode;
  confirmedDatabase?: string;
}

function parseOptions(args: string[]): SyncOptions {
  const execute = args.includes("--execute");
  const dryRun = args.includes("--dry-run");
  const unknownFlags = args.filter(
    (argument) =>
      argument.startsWith("--") &&
      argument !== "--execute" &&
      argument !== "--dry-run" &&
      !argument.startsWith("--confirm-database="),
  );

  if (execute && dryRun) {
    throw new Error("Chỉ chọn một mode: --dry-run hoặc --execute.");
  }
  if (unknownFlags.length > 0) {
    throw new Error(`Flag không được hỗ trợ: ${unknownFlags.join(", ")}`);
  }

  return {
    mode: execute ? "execute" : "dry-run",
    confirmedDatabase: args
      .find((argument) => argument.startsWith("--confirm-database="))
      ?.slice("--confirm-database=".length)
      .trim(),
  };
}

function resolveDatabaseName(databaseUrl?: string): string {
  if (!databaseUrl) {
    throw new Error("Thiếu DATABASE_URL.");
  }

  const parsed = new URL(databaseUrl);
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/u, "").split("/")[0] ?? "");
  if (!databaseName.startsWith("bookverse_")) {
    throw new Error(`Từ chối đồng bộ vào database ngoài BookVerse: ${databaseName || "(trống)"}.`);
  }

  return databaseName;
}

async function writeReport(report: Record<string, unknown>): Promise<string> {
  const outputDirectory = path.resolve(process.cwd(), "outputs", "catalog-listings");
  await mkdir(outputDirectory, { recursive: true });
  const runId = new Date().toISOString().replace(/[:.]/gu, "-");
  const reportPath = path.join(outputDirectory, `${runId}-${report.mode}.json`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  return reportPath;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const databaseName = resolveDatabaseName(process.env.DATABASE_URL);
  if (options.mode === "execute" && options.confirmedDatabase !== databaseName) {
    throw new Error(
      `Để chạy thật, thêm --confirm-database=${databaseName}. Script chưa thay đổi dữ liệu.`,
    );
  }

  const prisma = new PrismaClient();
  const startedAt = new Date();

  try {
    const books = await prisma.book.findMany({
      where: {
        id: { startsWith: "RB" },
        status: "ACTIVE",
        deletedAt: null,
        sourceMetadata: { isNot: null },
      },
      orderBy: { id: "asc" },
      select: {
        id: true,
        title: true,
        authorName: true,
        price: true,
        languageCode: true,
      },
    });

    if (books.length !== EXPECTED_REAL_CATALOG_BOOKS) {
      throw new Error(
        `Catalog runtime phải có ${EXPECTED_REAL_CATALOG_BOOKS} sách, thực tế có ${books.length}.`,
      );
    }

    const expectedIds = books.map((book) => catalogListingId(book.id));
    const existingListings = await prisma.listing.findMany({
      where: { id: { in: expectedIds } },
      orderBy: { id: "asc" },
      select: {
        id: true,
        bookId: true,
        sellerId: true,
        editionId: true,
        status: true,
        stock: true,
      },
    });
    const existingById = new Map(existingListings.map((listing) => [listing.id, listing]));

    for (const book of books) {
      const existing = existingById.get(catalogListingId(book.id));
      if (
        existing &&
        (existing.bookId !== book.id ||
          existing.sellerId !== CATALOG_STORE_USER_ID ||
          (existing.editionId !== null && existing.editionId !== catalogPaperEditionId(book.id)))
      ) {
        throw new Error(
          `Listing ${existing.id} đang liên kết sai Book, edition hoặc seller; từ chối ghi đè.`,
        );
      }
    }

    const missingBooks = books.filter((book) => !existingById.has(catalogListingId(book.id)));
    const rows: Prisma.ListingCreateManyInput[] = missingBooks.map((book) => ({
      id: catalogListingId(book.id),
      sellerId: CATALOG_STORE_USER_ID,
      bookId: book.id,
      editionId: catalogPaperEditionId(book.id),
      title: book.title,
      description: buildCatalogListingDescription(book.title, book.authorName),
      condition: ListingCondition.NEW,
      price: normalizeCatalogListingPrice(Number(book.price)),
      status: ListingStatus.APPROVED,
      moderationNote: "Listing chính thức được đồng bộ từ catalog BookVerse.",
      reviewedAt: startedAt,
      stock: stableCatalogStock(book.id),
      tags: ["bookverse-catalog", "official-store", "real-book"],
      hasCover: true,
      targetAudience: "Độc giả BookVerse",
    }));
    const editionRows: Prisma.BookEditionCreateManyInput[] = books.map((book) => ({
      id: catalogPaperEditionId(book.id),
      bookId: book.id,
      editionType: EditionType.PAPER_NEW,
      price: normalizeCatalogListingPrice(Number(book.price)),
      stock: stableCatalogStock(book.id),
      languageCode: book.languageCode,
      isActive: true,
    }));

    if (options.mode === "execute") {
      await prisma.$transaction(
        async (tx) => {
          const existingStore = await tx.user.findUnique({
            where: { id: CATALOG_STORE_USER_ID },
            select: { id: true, email: true, role: true },
          });

          if (
            existingStore &&
            (existingStore.email !== CATALOG_STORE_EMAIL || existingStore.role !== UserRole.SELLER)
          ) {
            throw new Error("ID gian hàng hệ thống đã tồn tại nhưng không đúng định danh.");
          }

          if (!existingStore) {
            await tx.user.create({
              data: {
                id: CATALOG_STORE_USER_ID,
                email: CATALOG_STORE_EMAIL,
                name: CATALOG_STORE_NAME,
                role: UserRole.SELLER,
              },
            });
          }

          const batchSize = 250;
          for (let index = 0; index < editionRows.length; index += batchSize) {
            await tx.bookEdition.createMany({
              data: editionRows.slice(index, index + batchSize),
              skipDuplicates: true,
            });
          }
          for (let index = 0; index < rows.length; index += batchSize) {
            await tx.listing.createMany({
              data: rows.slice(index, index + batchSize),
              skipDuplicates: true,
            });
          }

          // Chỉ gắn edition cho listing hệ thống còn null; không ghi đè liên kết đã có.
          await tx.$executeRaw`
            UPDATE "Listing"
            SET "editionId" = 'BV-EDITION-PAPER-NEW-' || "bookId"
            WHERE "id" LIKE 'BV-CATALOG-RB%'
              AND "bookId" LIKE 'RB%'
              AND "editionId" IS NULL
          `;
        },
        { maxWait: 20_000, timeout: 180_000 },
      );
    }

    const [officialListingsAfter, activeOfficialAfter, linkedRealBooksAfter, linkedPaperEditionsAfter] =
      await Promise.all([
      prisma.listing.count({
        where: { id: { startsWith: "BV-CATALOG-RB" } },
      }),
      prisma.listing.count({
        where: {
          id: { startsWith: "BV-CATALOG-RB" },
          status: ListingStatus.APPROVED,
          stock: { gt: 0 },
        },
      }),
      prisma.book.count({
        where: {
          id: { startsWith: "RB" },
          sourceMetadata: { isNot: null },
          listings: {
            some: {
              status: ListingStatus.APPROVED,
              stock: { gt: 0 },
            },
          },
        },
      }),
      prisma.listing.count({
        where: {
          id: { startsWith: "BV-CATALOG-RB" },
          edition: {
            is: {
              editionType: EditionType.PAPER_NEW,
            },
          },
        },
      }),
    ]);

    if (
      options.mode === "execute" &&
      (officialListingsAfter !== EXPECTED_REAL_CATALOG_BOOKS ||
        activeOfficialAfter !== EXPECTED_REAL_CATALOG_BOOKS ||
        linkedRealBooksAfter !== EXPECTED_REAL_CATALOG_BOOKS ||
        linkedPaperEditionsAfter !== EXPECTED_REAL_CATALOG_BOOKS)
    ) {
      throw new Error("Invariant sau đồng bộ không đạt: chưa đủ listing hoạt động cho catalog thật.");
    }

    const finishedAt = new Date();
    const report = {
      mode: options.mode,
      databaseName,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      catalogBooks: books.length,
      officialListingsBefore: existingListings.length,
      missingListings: missingBooks.length,
      plannedCreates: rows.length,
      officialListingsAfter,
      activeOfficialAfter,
      linkedRealBooksAfter,
      linkedPaperEditionsAfter,
      storeUserId: CATALOG_STORE_USER_ID,
      sample: rows.slice(0, 5).map((row) => ({
        id: row.id,
        bookId: row.bookId,
        price: row.price,
        stock: row.stock,
      })),
    };
    const reportPath = await writeReport(report);

    console.log(JSON.stringify({ ...report, reportPath }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
