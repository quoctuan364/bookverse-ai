/**
 * Kích hoạt catalog thật 3.046 cuốn cho môi trường demo hiện tại.
 *
 * Script chỉ upsert các ID RBxxxxx và ẩn catalog tổng hợp Bxxxx khỏi danh sách
 * công khai. Không xóa sách, đơn hàng, tài khoản hoặc dữ liệu hành vi.
 */
import { access } from "node:fs/promises";
import path from "node:path";

import {
  BookFormat,
  BookStatus,
  CoverReviewStatus,
  Prisma,
} from "@prisma/client";

import { assertSafeDatabase } from "@/lib/database-safety";
import {
  buildImportProjections,
  resolveCategoryTargets,
} from "@/lib/real-catalog-import";
import {
  loadAndValidateCategoryMapping,
  loadAndValidateRealCatalog,
  resolveSourceIdentity,
} from "@/lib/real-catalog";
import prisma from "@/lib/prisma";

const EXPECTED_BOOKS = 3_046;
const BATCH_SIZE = 100;
const SOURCE_PATH = path.resolve(
  process.cwd(),
  "data",
  "real-catalog",
  "bookverse_real_catalog.json",
);
const MAPPING_PATH = path.resolve(
  process.cwd(),
  "config",
  "real-catalog-category-mapping.json",
);

function languageCode(languages: string[], isVietnameseEdition: boolean): string | null {
  if (isVietnameseEdition || languages.includes("vie")) return "vi";
  const primary = languages[0];
  if (!primary) return null;
  if (primary === "eng") return "en";
  return primary;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function verifyLocalCoverCoverage(bookIds: string[]): Promise<{
  originalJpg: number;
  normalizedWebp: number;
}> {
  let originalJpg = 0;
  let normalizedWebp = 0;

  for (let offset = 0; offset < bookIds.length; offset += BATCH_SIZE) {
    const batch = bookIds.slice(offset, offset + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (bookId) => {
        const jpg = path.resolve(
          process.cwd(),
          "public",
          "covers",
          "real-catalog-local",
          `${bookId}.jpg`,
        );
        if (await fileExists(jpg)) return "jpg" as const;

        const webp = path.resolve(
          process.cwd(),
          "public",
          "covers",
          "real-catalog-local-normalized",
          `${bookId}.webp`,
        );
        if (await fileExists(webp)) return "webp" as const;
        throw new Error(`${bookId} chưa có ảnh local JPG hoặc WebP chuẩn hóa.`);
      }),
    );
    originalJpg += results.filter((result) => result === "jpg").length;
    normalizedWebp += results.filter((result) => result === "webp").length;
  }

  return { originalJpg, normalizedWebp };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const execute = args.includes("--execute");
  if (dryRun === execute) {
    throw new Error("Phải chọn chính xác một mode: --dry-run hoặc --execute.");
  }

  const target = assertSafeDatabase({
    operation: execute ? "destructive" : "read-only",
    databaseUrl: process.env.DATABASE_URL,
  });
  if (
    execute &&
    process.env.CONFIRM_REAL_CATALOG_ACTIVATION !== target.databaseName
  ) {
    throw new Error(
      `Cần CONFIRM_REAL_CATALOG_ACTIVATION=${target.databaseName} để xác nhận kích hoạt.`,
    );
  }

  const validation = loadAndValidateRealCatalog(SOURCE_PATH);
  if (!validation.catalog || validation.summary.books !== EXPECTED_BOOKS) {
    throw new Error(`Catalog phải có đúng ${EXPECTED_BOOKS} bản ghi hợp lệ.`);
  }
  const mapping = loadAndValidateCategoryMapping(
    MAPPING_PATH,
    validation.catalog,
    validation.summary.catalogChecksum,
  );
  if (!mapping.mapping) throw new Error("Category mapping không hợp lệ.");

  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      canonicalKey: true,
      canonicalName: true,
      parentId: true,
    },
  });
  const categoryResolution = resolveCategoryTargets(mapping.mapping, categories);
  if (categoryResolution.errors.length > 0) {
    throw new Error(categoryResolution.errors.join(" | "));
  }

  const identities = new Map(
    validation.catalog.books.flatMap((book) => {
      const identity = resolveSourceIdentity(book);
      return identity ? [[book.id, identity] as const] : [];
    }),
  );
  const built = buildImportProjections(
    validation.catalog,
    identities,
    categoryResolution.rows,
  );
  if (built.errors.length > 0 || built.projections.length !== EXPECTED_BOOKS) {
    throw new Error(`Projection không hợp lệ: ${built.errors.join(" | ")}`);
  }

  const coverCoverage = await verifyLocalCoverCoverage(
    built.projections.map((projection) => projection.book.id),
  );
  const existing = await prisma.book.findMany({
    where: { id: { in: built.projections.map((item) => item.book.id) } },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((book) => book.id));
  const currentSlugOwners = new Map(
    (
      await prisma.book.findMany({
        select: { id: true, slug: true },
      })
    ).map((book) => [book.slug, book.id]),
  );

  let created = 0;
  let updated = 0;
  for (let offset = 0; offset < built.projections.length; offset += BATCH_SIZE) {
    const batch = built.projections.slice(offset, offset + BATCH_SIZE);
    const operations: Array<Prisma.PrismaPromise<unknown>> = [];

    for (const projection of batch) {
      const { book, metadata } = projection;
      const owner = currentSlugOwners.get(book.slug);
      const slug = !owner || owner === book.id
        ? book.slug
        : `real-${book.id.toLowerCase()}-${book.slug}`;
      currentSlugOwners.set(slug, book.id);
      const publicBook = validation.catalog.books.find((item) => item.id === book.id);
      if (!publicBook) throw new Error(`Thiếu source book ${book.id}.`);

      const bookData = {
        title: book.title,
        slug,
        authorName: book.authorName,
        description: book.description,
        level: book.level,
        format: BookFormat.PAPER,
        price: book.price,
        rating: book.rating,
        pages: book.pages,
        publishYear: book.publishYear,
        isEbook: false,
        status: BookStatus.ACTIVE,
        deletedAt: null,
        // Giữ URL nguồn để truy vết; BookCover luôn ưu tiên file local đúng bookId.
        coverPath: book.coverPath,
        languageCode: languageCode(
          publicBook.languages,
          publicBook.isVietnameseEdition,
        ),
        // Toàn bộ 3.046 ID đã được kiểm tra có JPG local hoặc WebP chuẩn hóa.
        coverReviewStatus: CoverReviewStatus.VERIFIED_LOCAL,
        isPubliclyVisible: true,
        categoryId: book.categoryId,
      };

      operations.push(
        prisma.book.upsert({
          where: { id: book.id },
          create: { id: book.id, ...bookData },
          update: bookData,
        }),
      );
      operations.push(
        prisma.bookSourceMetadata.upsert({
          where: { bookId: book.id },
          create: { bookId: book.id, ...metadata },
          update: metadata,
        }),
      );
      if (existingIds.has(book.id)) updated += 1;
      else created += 1;
    }

    if (execute) {
      await prisma.$transaction(operations);
      console.log(
        `[OK] real catalog ${Math.min(offset + BATCH_SIZE, EXPECTED_BOOKS)}/${EXPECTED_BOOKS}`,
      );
    }
  }

  const syntheticVisibleBefore = await prisma.book.count({
    where: { id: { startsWith: "B" }, isPubliclyVisible: true },
  });
  if (execute) {
    // Chỉ ẩn khỏi catalog công khai; dữ liệu và các liên kết lịch sử vẫn nguyên vẹn.
    await prisma.book.updateMany({
      where: { id: { startsWith: "B" } },
      data: { isPubliclyVisible: false },
    });
  }

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? "dry-run" : "execute",
        database: target.maskedUrl,
        catalogBooks: built.projections.length,
        coverCoverage,
        willCreate: created,
        willUpdate: updated,
        syntheticBooksHiddenOnExecute: syntheticVisibleBefore,
        categoriesResolved: categoryResolution.rows.length,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? `[FAIL] ${error.message}` : "[FAIL] Lỗi không xác định.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
