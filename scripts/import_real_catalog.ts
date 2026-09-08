import fs from "node:fs";
import path from "node:path";

import { BookFormat, BookStatus, Prisma, PrismaClient } from "@prisma/client";

import { assertSafeDatabase } from "@/lib/database-safety";
import {
  buildImportProjections,
  projectionChecksum,
  resolveCategoryTargets,
  type ImportProjection,
} from "@/lib/real-catalog-import";
import {
  loadAndValidateCategoryMapping,
  loadAndValidateRealCatalog,
  REAL_CATALOG_PROVIDER,
  resolveSourceIdentity,
} from "@/lib/real-catalog";

type ImportMode = "validate-only" | "dry-run" | "execute";
type PlanAction = "INSERT" | "UPDATE" | "UNCHANGED" | "REJECTED";

interface PlannedItem {
  action: PlanAction;
  projection: ImportProjection;
  reason?: string;
}

interface DatabaseSnapshot {
  books: number;
  realCatalogBooks: number;
  syntheticBooks: number;
  orders: number;
  reviews: number;
  interactions: number;
  interactionEvents: number;
  recommendations: number;
}

const root = process.cwd();
const sourcePath = path.resolve(root, "data", "real-catalog", "bookverse_real_catalog.json");
const mappingPath = path.resolve(root, "config", "real-catalog-category-mapping.json");
const outputDirectory = path.resolve(root, "outputs", "real-catalog");
const BATCH_SIZE = 100;

function parseMode(args: string[]): ImportMode {
  const modes = ["validate-only", "dry-run", "execute"].filter((mode) => args.includes(`--${mode}`));
  if (modes.length > 1) throw new Error("Chỉ được chọn một mode: --validate-only, --dry-run hoặc --execute.");
  return (modes[0] as ImportMode | undefined) ?? "validate-only";
}

function sanitizeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(/postgres(?:ql)?:\/\/[^\s"']+/giu, "postgresql://***:***@***/***");
}

function runId(): string {
  return new Date().toISOString().replace(/[:.]/gu, "-");
}

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function writeRunReport(report: Record<string, unknown>, rejected: Array<{ bookId: string; reason: string }>): {
  jsonPath: string;
  csvPath: string;
} {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const id = runId();
  const jsonPath = path.join(outputDirectory, `real-catalog-${id}.json`);
  const csvPath = path.join(outputDirectory, `real-catalog-${id}-rejected.csv`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  const csvRows = [
    ["book_id", "reason"],
    ...rejected.map((row) => [row.bookId, row.reason]),
  ];
  fs.writeFileSync(csvPath, `${csvRows.map((row) => row.map(escapeCsv).join(",")).join("\n")}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  return { jsonPath, csvPath };
}

async function tableExists(prisma: PrismaClient): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ name: string | null }>>`
    SELECT to_regclass('public.book_source_metadata')::text AS name
  `;
  return Boolean(rows[0]?.name);
}

async function snapshot(prisma: PrismaClient): Promise<DatabaseSnapshot> {
  const [books, realCatalogBooks, orders, reviews, interactions, interactionEvents, recommendations] =
    await Promise.all([
      prisma.book.count(),
      prisma.bookSourceMetadata.count({ where: { sourceProvider: REAL_CATALOG_PROVIDER } }),
      prisma.order.count(),
      prisma.review.count(),
      prisma.interaction.count(),
      prisma.interactionEvent.count(),
      prisma.recommendation.count(),
    ]);
  return {
    books,
    realCatalogBooks,
    syntheticBooks: books - realCatalogBooks,
    orders,
    reviews,
    interactions,
    interactionEvents,
    recommendations,
  };
}

type ExistingSource = Prisma.BookSourceMetadataGetPayload<{ include: { book: true } }>;

function existingProjection(row: ExistingSource): ImportProjection {
  return {
    book: {
      id: row.book.id,
      title: row.book.title,
      slug: row.book.slug,
      authorName: row.book.authorName,
      description: row.book.description,
      level: row.book.level,
      format: row.book.format as "PAPER",
      price: Number(row.book.price.toString()),
      rating: null,
      pages: row.book.pages,
      publishYear: row.book.publishYear,
      isEbook: false,
      status: row.book.status as "ACTIVE",
      deletedAt: null,
      coverPath: row.book.coverPath ?? "",
      categoryId: row.book.categoryId,
    },
    metadata: {
      sourceProvider: row.sourceProvider as "OPEN_LIBRARY",
      sourceRecordKey: row.sourceRecordKey,
      sourceRecordType: row.sourceRecordType as "WORK" | "EDITION_ONLY",
      sourceWorkKey: row.sourceWorkKey,
      sourceWorkKeyRaw: row.sourceWorkKeyRaw ?? "",
      sourceEditionKey: row.sourceEditionKey,
      sourcePageUrl: row.sourcePageUrl,
      dataLabel: row.dataLabel,
      metadataQuality: row.metadataQuality,
      coverId: row.coverId ?? "",
      coverRightsStatus: row.coverRightsStatus,
      priceStatus: row.priceStatus,
      languageProfile: row.languageProfile,
      languages: [...row.languages],
      isbn: row.isbn,
      publisher: row.publisher,
      sourceFormat: row.sourceFormat,
      descriptionStatus: row.descriptionStatus,
      sourceRatingStatus: row.sourceRatingStatus,
      sourceRatingAverage: row.sourceRatingAverage,
      sourceRatingCount: row.sourceRatingCount,
      primarySourceCategoryId: row.primarySourceCategoryId,
      primarySourceCategoryName: row.primarySourceCategoryName,
      sourceCategoryIds: [...row.sourceCategoryIds],
      isVietnameseEdition: row.isVietnameseEdition,
      authorNationality: row.authorNationality,
    },
  };
}

async function buildPlan(prisma: PrismaClient): Promise<{
  validationStatus: "VERIFIED" | "PARTIAL" | "FAILED";
  validationSummary: ReturnType<typeof loadAndValidateRealCatalog>["summary"];
  categoryMappingChecksum: string;
  categoryRows: ReturnType<typeof resolveCategoryTargets>["rows"];
  items: PlannedItem[];
  rejected: Array<{ bookId: string; reason: string }>;
}> {
  const validation = loadAndValidateRealCatalog(sourcePath);
  if (!validation.catalog) throw new Error("Real catalog runtime validation FAILED.");
  const mappingValidation = loadAndValidateCategoryMapping(
    mappingPath,
    validation.catalog,
    validation.summary.catalogChecksum,
  );
  if (!mappingValidation.mapping) throw new Error("Real catalog category mapping FAILED.");
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, slug: true, canonicalKey: true, canonicalName: true, parentId: true },
  });
  const categoryResolution = resolveCategoryTargets(mappingValidation.mapping, categories);
  if (categoryResolution.errors.length > 0) {
    throw new Error(`Category mapping fail-closed: ${categoryResolution.errors.join(" | ")}`);
  }
  const identities = new Map(
    validation.catalog.books.flatMap((book) => {
      const identity = resolveSourceIdentity(book);
      return identity ? [[book.id, identity] as const] : [];
    }),
  );
  const built = buildImportProjections(validation.catalog, identities, categoryResolution.rows);
  if (built.errors.length > 0) throw new Error(`Projection validation failed: ${built.errors.join(" | ")}`);

  const [existingSources, collisions] = await Promise.all([
    prisma.bookSourceMetadata.findMany({
      where: { sourceProvider: REAL_CATALOG_PROVIDER },
      include: { book: true },
    }),
    prisma.book.findMany({
      where: {
        OR: [
          { id: { in: built.projections.map((projection) => projection.book.id) } },
          { slug: { in: built.projections.map((projection) => projection.book.slug) } },
        ],
      },
      select: { id: true, slug: true, sourceMetadata: { select: { sourceProvider: true, sourceRecordKey: true } } },
    }),
  ]);
  const existingByRecord = new Map(existingSources.map((row) => [row.sourceRecordKey, row]));
  const collisionById = new Map(collisions.map((row) => [row.id, row]));
  const collisionBySlug = new Map(collisions.map((row) => [row.slug, row]));
  const items: PlannedItem[] = [];
  const rejected: Array<{ bookId: string; reason: string }> = [];

  for (const projection of built.projections) {
    const current = existingByRecord.get(projection.metadata.sourceRecordKey);
    if (current) {
      if (current.bookId !== projection.book.id) {
        const reason = `SOURCE_BOOK_ID_DRIFT: database=${current.bookId}, input=${projection.book.id}`;
        items.push({ action: "REJECTED", projection, reason });
        rejected.push({ bookId: projection.book.id, reason });
        continue;
      }
      const unchanged = projectionChecksum(existingProjection(current)) === projectionChecksum(projection);
      items.push({ action: unchanged ? "UNCHANGED" : "UPDATE", projection });
      continue;
    }
    const idCollision = collisionById.get(projection.book.id);
    const slugCollision = collisionBySlug.get(projection.book.slug);
    if (idCollision || slugCollision) {
      const reason = idCollision
        ? `BOOK_ID_COLLISION_WITHOUT_SOURCE_METADATA:${idCollision.id}`
        : `BOOK_SLUG_COLLISION_WITHOUT_SOURCE_METADATA:${slugCollision?.id ?? "unknown"}`;
      items.push({ action: "REJECTED", projection, reason });
      rejected.push({ bookId: projection.book.id, reason });
      continue;
    }
    items.push({ action: "INSERT", projection });
  }
  return {
    validationStatus: validation.summary.status,
    validationSummary: validation.summary,
    categoryMappingChecksum: mappingValidation.mappingChecksum,
    categoryRows: categoryResolution.rows,
    items,
    rejected,
  };
}

async function executePlan(prisma: PrismaClient, items: PlannedItem[]): Promise<void> {
  const actionable = items.filter((item) => item.action === "INSERT" || item.action === "UPDATE");
  for (let offset = 0; offset < actionable.length; offset += BATCH_SIZE) {
    const batch = actionable.slice(offset, offset + BATCH_SIZE);
    const operations: Array<Prisma.PrismaPromise<unknown>> = [];
    for (const item of batch) {
      const { book, metadata } = item.projection;
      const bookData = {
        title: book.title,
        slug: book.slug,
        authorName: book.authorName,
        description: book.description,
        level: book.level,
        format: BookFormat.PAPER,
        price: book.price,
        rating: null,
        pages: book.pages,
        publishYear: book.publishYear,
        isEbook: false,
        status: BookStatus.ACTIVE,
        deletedAt: null,
        coverPath: book.coverPath,
        categoryId: book.categoryId,
      };
      if (item.action === "INSERT") {
        operations.push(
          prisma.book.create({
            data: {
              id: book.id,
              ...bookData,
              sourceMetadata: { create: metadata },
            },
          }),
        );
      } else {
        operations.push(prisma.book.update({ where: { id: book.id }, data: bookData }));
        operations.push(
          prisma.bookSourceMetadata.update({
            where: { bookId: book.id },
            data: metadata,
          }),
        );
      }
    }
    await prisma.$transaction(operations);
    console.log(`[EXECUTE] ${Math.min(offset + batch.length, actionable.length)}/${actionable.length}`);
  }
}

function countActions(items: PlannedItem[]): Record<PlanAction, number> {
  return {
    INSERT: items.filter((item) => item.action === "INSERT").length,
    UPDATE: items.filter((item) => item.action === "UPDATE").length,
    UNCHANGED: items.filter((item) => item.action === "UNCHANGED").length,
    REJECTED: items.filter((item) => item.action === "REJECTED").length,
  };
}

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  const validation = loadAndValidateRealCatalog(sourcePath);
  const mappingValidation = validation.catalog
    ? loadAndValidateCategoryMapping(mappingPath, validation.catalog, validation.summary.catalogChecksum)
    : { mapping: null, issues: [], mappingChecksum: "NOT_AVAILABLE" };
  if (!validation.catalog || !mappingValidation.mapping) {
    const report = {
      status: "FAILED",
      mode,
      validation: validation.summary,
      mappingIssues: mappingValidation.issues,
    };
    const paths = writeRunReport(report, []);
    console.log(JSON.stringify({ ...report, reportPaths: paths }, null, 2));
    process.exitCode = 1;
    return;
  }
  if (mode === "validate-only") {
    const report = {
      status: validation.summary.status,
      mode,
      database: "NOT_ACCESSED",
      validation: validation.summary,
      categoryMapping: { status: "VERIFIED", checksum: mappingValidation.mappingChecksum, entries: 39 },
    };
    const paths = writeRunReport(report, []);
    console.log(JSON.stringify({ ...report, reportPaths: paths }, null, 2));
    return;
  }

  const databaseUrl = process.env.REAL_CATALOG_DATABASE_URL ?? process.env.DATABASE_URL;
  const target = assertSafeDatabase({
    operation: mode === "execute" ? "destructive" : "read-only",
    databaseUrl,
    allowedDatabases: process.env.REAL_CATALOG_ALLOWED_DATABASES ?? process.env.ALLOWED_DESTRUCTIVE_DATABASES,
  });
  if (mode === "execute") {
    if (target.databaseName === "bookverse_ai") throw new Error("BLOCKED_DEMO_DATABASE_WRITE: bookverse_ai chỉ được read-only.");
    if (!/(?:_test(?:$|_)|_clone(?:$|_)|_rehearsal(?:$|_))/u.test(target.databaseName)) {
      throw new Error(`BLOCKED_UNSAFE_DATABASE_NAME: ${target.databaseName} không phải test/clone/rehearsal.`);
    }
  }
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    if (!(await tableExists(prisma))) throw new Error("SCHEMA_NOT_READY: book_source_metadata chưa tồn tại.");
    const before = await snapshot(prisma);
    const plan = await buildPlan(prisma);
    const actions = countActions(plan.items);
    if (mode === "execute" && plan.rejected.length > 0) {
      throw new Error(`IMPORT_REJECTED: ${plan.rejected.length} record bị từ chối trước write.`);
    }
    if (mode === "execute") await executePlan(prisma, plan.items);
    const after = await snapshot(prisma);
    const unchangedNonCatalogData =
      before.syntheticBooks === after.syntheticBooks &&
      before.orders === after.orders &&
      before.reviews === after.reviews &&
      before.interactions === after.interactions &&
      before.interactionEvents === after.interactionEvents &&
      before.recommendations === after.recommendations;
    if (!unchangedNonCatalogData) throw new Error("NON_CATALOG_COUNT_DRIFT: synthetic/behavior count đã thay đổi.");
    const report = {
      status: plan.validationStatus,
      mode,
      database: target.databaseName,
      catalogChecksum: plan.validationSummary.catalogChecksum,
      categoryMappingChecksum: plan.categoryMappingChecksum,
      validation: {
        books: plan.validationSummary.books,
        workRecords: plan.validationSummary.uniqueWorkRecords,
        editionOnlyRecords: plan.validationSummary.editionOnlyRecords,
        sourceRecords: plan.validationSummary.uniqueSourceRecords,
        coverUrls: plan.validationSummary.uniqueCoverUrls,
        isbn: plan.validationSummary.uniqueIsbn,
        vietnameseEditions: plan.validationSummary.vietnameseEditions,
        missingLanguage: plan.validationSummary.missingLanguage,
      },
      actions,
      categoryMapping: plan.categoryRows,
      coverPolicy: {
        allowlist: "https://covers.openlibrary.org",
        rightsStatus: "NOT_VERIFIED",
        invalidUrls: plan.validationSummary.invalidCoverUrls,
        httpFullCatalog: "NOT_VERIFIED",
      },
      before,
      after,
      nonCatalogCountsUnchanged: unchangedNonCatalogData,
    };
    const paths = writeRunReport(report, plan.rejected);
    console.log(JSON.stringify({ ...report, reportPaths: paths }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = sanitizeError(error);
  const report = { status: "FAILED", error: message };
  try {
    const paths = writeRunReport(report, []);
    console.error(JSON.stringify({ ...report, reportPaths: paths }, null, 2));
  } catch {
    console.error(JSON.stringify(report));
  }
  process.exitCode = 1;
});
