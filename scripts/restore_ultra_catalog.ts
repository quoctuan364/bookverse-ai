/**
 * Khôi phục riêng catalog 2.200 sách và bìa SVG do người dùng cung cấp.
 *
 * Script không xóa bảng và không ghi vào dataset/asset gốc. Các tài khoản,
 * đơn hàng và dữ liệu tính năng mới được giữ nguyên.
 */
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import {
  BookFormat,
  BookStatus,
  CoverReviewStatus,
} from "@prisma/client";

import { loadCategoryMapping } from "@/lib/category-mapping-file";
import { assertSafeDatabase } from "@/lib/database-safety";
import prisma from "@/lib/prisma";

const DATASET_PATH = path.resolve(
  process.cwd(),
  "data",
  "json",
  "bookverse_ultra_seed_2200.json",
);
const EXPECTED_BOOKS = 2_200;
const BATCH_SIZE = 100;

interface UltraBook {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  category_id: number;
  published_year?: number | string | null;
  publication_year?: number | string | null;
  page_count: number | null;
  price: number;
  ebook_price: number | null;
  format: string;
  reading_level: string | null;
  cover_url: string | null;
  rating_avg?: number | string | null;
  rating_average?: number | string | null;
  created_at: string;
}

interface UltraDataset {
  books: UltraBook[];
  authors: Array<{ id: number; name: string }>;
  book_authors: Array<{ book_id: number; author_id: number }>;
  ebooks: Array<{ book_id: number }>;
}

function formatBookId(value: number): string {
  return `B${String(value).padStart(4, "0")}`;
}

function formatSourceCategoryId(value: number): string {
  return `C${String(value).padStart(3, "0")}`;
}

function toOptionalNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapFormat(format: string, hasEbook: boolean): BookFormat {
  if (format === "EBOOK") return BookFormat.EBOOK;
  return hasEbook ? BookFormat.BOTH : BookFormat.PAPER;
}

function buildAuthorMap(dataset: UltraDataset): Map<number, string> {
  const authorById = new Map(dataset.authors.map((author) => [author.id, author.name]));
  const namesByBook = new Map<number, string[]>();

  for (const relation of dataset.book_authors) {
    const authorName = authorById.get(relation.author_id);
    if (!authorName) continue;
    const names = namesByBook.get(relation.book_id) ?? [];
    names.push(authorName);
    namesByBook.set(relation.book_id, names);
  }

  return new Map(
    dataset.books.map((book) => [
      book.id,
      [...new Set(namesByBook.get(book.id) ?? [])].slice(0, 3).join(", ") ||
        "Tác giả chưa cập nhật",
    ]),
  );
}

async function verifyCoverAssets(books: UltraBook[]): Promise<void> {
  for (let index = 0; index < books.length; index += BATCH_SIZE) {
    const batch = books.slice(index, index + BATCH_SIZE);
    await Promise.all(
      batch.map(async (book) => {
        const coverUrl = book.cover_url?.trim();
        if (!coverUrl || !/^\/covers\/flat\/book-\d{4}\.svg$/u.test(coverUrl)) {
          throw new Error(`Book ${book.id} có cover_url không hợp lệ.`);
        }
        await access(path.resolve(process.cwd(), "public", coverUrl.replace(/^\/+/, "")));
      }),
    );
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const execute = args.includes("--execute");
  if (dryRun === execute) {
    throw new Error("Phải chọn chính xác một mode: --dry-run hoặc --execute.");
  }

  const databaseTarget = assertSafeDatabase({
    operation: execute ? "destructive" : "read-only",
    databaseUrl: process.env.DATABASE_URL,
  });
  const dataset = JSON.parse(await readFile(DATASET_PATH, "utf8")) as UltraDataset;
  const categoryMapping = await loadCategoryMapping();

  if (dataset.books.length !== EXPECTED_BOOKS) {
    throw new Error(`Dataset phải có ${EXPECTED_BOOKS} sách, nhận được ${dataset.books.length}.`);
  }
  await verifyCoverAssets(dataset.books);

  const bookIds = dataset.books.map((book) => formatBookId(book.id));
  const existingBooks = await prisma.book.findMany({
    where: { id: { in: bookIds } },
    select: { id: true },
  });
  const existingBookIds = new Set(existingBooks.map((book) => book.id));
  const currentSlugs = await prisma.book.findMany({ select: { id: true, slug: true } });
  const slugOwner = new Map(currentSlugs.map((book) => [book.slug, book.id]));
  const authorByBookId = buildAuthorMap(dataset);
  const ebookBookIds = new Set(dataset.ebooks.map((ebook) => ebook.book_id));

  // Gom 2.200 category chi tiết vào các nhóm canonical hiện có để bộ lọc gọn
  // và không xung đột unique name/slug với dữ liệu đang vận hành.
  const currentCategories = await prisma.category.findMany({
    orderBy: [{ parentId: "asc" }, { id: "asc" }],
  });
  const categoryByName = new Map(
    currentCategories.map((category) => [category.name.toLocaleLowerCase("vi"), category]),
  );
  const categoryByCanonicalKey = new Map(
    currentCategories
      .filter((category) => category.parentId === null && category.canonicalKey)
      .map((category) => [category.canonicalKey!, category]),
  );
  const canonicalTargetId = new Map<string, string>();

  for (const entry of categoryMapping.file.entries) {
    if (canonicalTargetId.has(entry.canonicalName)) continue;
    const byName = categoryByName.get(entry.canonicalName.toLocaleLowerCase("vi"));
    const byKey = categoryByCanonicalKey.get(entry.canonicalKey);
    const existing = byName ?? byKey;

    if (existing) {
      canonicalTargetId.set(entry.canonicalName, existing.id);
      continue;
    }

    const id = `ULTRA-CAT-${entry.canonicalKey}`;
    const category = execute
      ? await prisma.category.upsert({
          where: { id },
          create: {
            id,
            name: entry.canonicalName,
            slug: `ultra-${entry.canonicalKey}`,
            description: "Nhóm thể loại chuẩn hóa cho catalog 2.200 sách.",
            level: 1,
            canonicalKey: entry.canonicalKey,
            canonicalName: entry.canonicalName,
          },
          update: {
            name: entry.canonicalName,
            canonicalKey: entry.canonicalKey,
            canonicalName: entry.canonicalName,
          },
        })
      : { id };
    canonicalTargetId.set(entry.canonicalName, category.id);
  }

  const targetCategoryBySourceId = new Map(
    categoryMapping.file.entries.map((entry) => {
      const targetId = canonicalTargetId.get(entry.canonicalName);
      if (!targetId) throw new Error(`Thiếu canonical category ${entry.canonicalName}.`);
      return [entry.categoryId, targetId];
    }),
  );

  let created = 0;
  let updated = 0;
  for (let index = 0; index < dataset.books.length; index += BATCH_SIZE) {
    const batch = dataset.books.slice(index, index + BATCH_SIZE);
    const operations = batch.map((book) => {
      const id = formatBookId(book.id);
      const desiredSlug = book.slug.trim() || `book-${book.id}`;
      const owner = slugOwner.get(desiredSlug);
      const slug = !owner || owner === id ? desiredSlug : `ultra-${book.id}-${desiredSlug}`;
      slugOwner.set(slug, id);
      const categoryId = targetCategoryBySourceId.get(
        formatSourceCategoryId(book.category_id),
      );
      if (!categoryId) throw new Error(`Book ${id} chưa có category mapping.`);

      const data = {
        title: book.title,
        slug,
        authorName: authorByBookId.get(book.id) ?? "Tác giả chưa cập nhật",
        description: book.description,
        level: book.reading_level,
        format: mapFormat(book.format, ebookBookIds.has(book.id)),
        price: book.ebook_price ?? book.price,
        rating: toOptionalNumber(book.rating_avg ?? book.rating_average),
        pages: book.page_count,
        publishYear: toOptionalNumber(book.published_year ?? book.publication_year),
        isEbook: ebookBookIds.has(book.id) || book.format === "EBOOK",
        status: BookStatus.ACTIVE,
        deletedAt: null,
        coverPath: book.cover_url,
        languageCode: "vi",
        coverReviewStatus: CoverReviewStatus.NEEDS_COVER_REVIEW,
        isPubliclyVisible: true,
        categoryId,
      };

      if (existingBookIds.has(id)) updated += 1;
      else created += 1;

      return prisma.book.upsert({
        where: { id },
        create: { id, ...data, createdAt: new Date(book.created_at) },
        update: data,
      });
    });

    if (execute) {
      await prisma.$transaction(operations);
      console.log(`[OK] books ${Math.min(index + BATCH_SIZE, dataset.books.length)}/${dataset.books.length}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? "dry-run" : "execute",
        database: databaseTarget.maskedUrl,
        datasetBooks: dataset.books.length,
        verifiedCoverAssets: dataset.books.length,
        willCreate: created,
        willUpdate: updated,
        canonicalCategories: canonicalTargetId.size,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? `[FAIL] ${error.message}` : "[FAIL] Lỗi không xác định.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
