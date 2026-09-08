/**
 * Làm sạch phần hiển thị của catalog thật:
 * - Ẩn các ấn bản trùng tên + tác giả, không xóa dữ liệu.
 * - Ẩn listing chính thức tương ứng để Marketplace không hiện trùng.
 * - Sửa một số phân loại sai rõ ràng đã được kiểm tra thủ công.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { ListingStatus, type Prisma } from "@prisma/client";

import { assertSafeDatabase } from "@/lib/database-safety";
import prisma from "@/lib/prisma";

const OFFICIAL_LISTING_PREFIX = "BV-CATALOG-";
const REPORT_DIRECTORY = path.resolve(process.cwd(), "outputs", "data-quality");

interface DuplicateCandidate {
  id: string;
  title: string;
  authorName: string;
  description: string | null;
  pages: number | null;
  publishYear: number | null;
  sourceMetadata: {
    isbn: string | null;
    publisher: string | null;
    isVietnameseEdition: boolean;
  } | null;
}

const CATEGORY_CORRECTIONS = [
  { id: "RB00274", title: "2001", targetCategoryId: "C014" },
  { id: "RB00275", title: "2010", targetCategoryId: "C014" },
  { id: "RB00276", title: "By Arthur C. Clarke 2061", targetCategoryId: "C014" },
  { id: "RB00294", title: "A fall of moondust", targetCategoryId: "C014" },
  { id: "RB01295", title: "I am legend", targetCategoryId: "C014" },
  { id: "RB02550", title: "The Science Fiction Hall of Fame", targetCategoryId: "C014" },
  { id: "RB02990", title: "I am legend", targetCategoryId: "C014" },
] as const;

function normalizeIdentity(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("vi")
    .replace(/\+/gu, " plus ")
    .replace(/#/gu, " sharp ")
    .replace(/&/gu, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function duplicateKey(book: DuplicateCandidate): string {
  return `${normalizeIdentity(book.title)}|${normalizeIdentity(book.authorName)}`;
}

function qualityScore(book: DuplicateCandidate): number {
  const metadata = book.sourceMetadata;
  return (
    (metadata?.isVietnameseEdition ? 100 : 0) +
    (metadata?.isbn ? 30 : 0) +
    (metadata?.publisher ? 10 : 0) +
    (book.description ? 5 : 0) +
    (book.pages ? 5 : 0) +
    (book.publishYear ? 3 : 0)
  );
}

function selectRepresentative(group: DuplicateCandidate[]): DuplicateCandidate {
  return [...group].sort(
    (left, right) =>
      qualityScore(right) - qualityScore(left) ||
      (right.publishYear ?? 0) - (left.publishYear ?? 0) ||
      (right.pages ?? 0) - (left.pages ?? 0) ||
      left.id.localeCompare(right.id),
  )[0];
}

async function writeReport(report: Record<string, unknown>): Promise<string> {
  await mkdir(REPORT_DIRECTORY, { recursive: true });
  const runId = new Date().toISOString().replace(/[:.]/gu, "-");
  const reportPath = path.join(REPORT_DIRECTORY, `${runId}-catalog-cleanup.json`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  return reportPath;
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
  if (execute && process.env.CONFIRM_CATALOG_CLEANUP !== target.databaseName) {
    throw new Error(
      `Cần CONFIRM_CATALOG_CLEANUP=${target.databaseName} để xác nhận làm sạch.`,
    );
  }

  const books = await prisma.book.findMany({
    where: {
      id: { startsWith: "RB" },
      isPubliclyVisible: true,
      status: "ACTIVE",
      deletedAt: null,
      sourceMetadata: { isNot: null },
    },
    select: {
      id: true,
      title: true,
      authorName: true,
      description: true,
      pages: true,
      publishYear: true,
      sourceMetadata: {
        select: {
          isbn: true,
          publisher: true,
          isVietnameseEdition: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });

  const groups = new Map<string, DuplicateCandidate[]>();
  for (const book of books) {
    const key = duplicateKey(book);
    const current = groups.get(key) ?? [];
    current.push(book);
    groups.set(key, current);
  }

  const duplicateGroups = [...groups.values()].filter((group) => group.length > 1);
  const duplicatePlan = duplicateGroups.map((group) => {
    const representative = selectRepresentative(group);
    return {
      key: duplicateKey(representative),
      title: representative.title,
      authorName: representative.authorName,
      keepId: representative.id,
      hideIds: group
        .filter((book) => book.id !== representative.id)
        .map((book) => book.id)
        .sort(),
    };
  });
  const hideIds = duplicatePlan.flatMap((group) => group.hideIds);

  const targetCategory = await prisma.category.findUnique({
    where: { id: "C014" },
    select: { id: true, canonicalKey: true, canonicalName: true },
  });
  if (
    !targetCategory ||
    targetCategory.canonicalKey !== "science-fiction" ||
    targetCategory.canonicalName !== "Khoa học viễn tưởng"
  ) {
    throw new Error("Category C014 không còn là Khoa học viễn tưởng.");
  }

  const correctionBooks = await prisma.book.findMany({
    where: { id: { in: CATEGORY_CORRECTIONS.map((item) => item.id) } },
    select: { id: true, title: true, categoryId: true },
  });
  const correctionById = new Map(correctionBooks.map((book) => [book.id, book]));
  for (const correction of CATEGORY_CORRECTIONS) {
    const book = correctionById.get(correction.id);
    if (!book || book.title !== correction.title) {
      throw new Error(`Dữ liệu ${correction.id} đã thay đổi, từ chối sửa category.`);
    }
  }
  const categoryChanges = CATEGORY_CORRECTIONS.filter(
    (correction) =>
      correctionById.get(correction.id)?.categoryId !== correction.targetCategoryId,
  );

  if (execute) {
    const operations: Array<Prisma.PrismaPromise<unknown>> = [];
    if (hideIds.length > 0) {
      operations.push(
        prisma.book.updateMany({
          where: { id: { in: hideIds } },
          data: { isPubliclyVisible: false },
        }),
      );
      operations.push(
        prisma.listing.updateMany({
          where: {
            id: {
              in: hideIds.map((bookId) => `${OFFICIAL_LISTING_PREFIX}${bookId}`),
            },
          },
          data: {
            status: ListingStatus.HIDDEN,
            moderationNote:
              "Ẩn khỏi gian hàng vì trùng tên và tác giả với một ấn bản đại diện đầy đủ hơn.",
          },
        }),
      );
    }
    for (const correction of categoryChanges) {
      operations.push(
        prisma.book.update({
          where: { id: correction.id },
          data: { categoryId: correction.targetCategoryId },
        }),
      );
    }
    if (operations.length > 0) await prisma.$transaction(operations);
  }

  const report = {
    mode: dryRun ? "dry-run" : "execute",
    database: target.maskedUrl,
    publicBooksBefore: books.length,
    duplicateGroups: duplicatePlan.length,
    duplicateBooksToHide: hideIds.length,
    publicBooksAfterExecute: books.length - hideIds.length,
    categoryChanges: categoryChanges.map((change) => ({
      id: change.id,
      title: change.title,
      targetCategory: "Khoa học viễn tưởng",
    })),
    duplicatePlan,
  };
  const reportPath = await writeReport(report);
  console.log(JSON.stringify({ ...report, reportPath }, null, 2));
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
