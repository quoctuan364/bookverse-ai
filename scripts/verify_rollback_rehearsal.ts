import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { assertSafeDatabase } from "@/lib/database-safety";

interface CountRow {
  value: number;
}

interface RecommendationRow {
  bookId: string;
  categoryId: string;
  featureCategoryId: string;
  categoryName: string;
}

const EXPECTED_COUNTS = {
  users: 300,
  categories: 24,
  books: 1200,
  listings: 1200,
  orders: 1500,
  orderItems: 2570,
};

function invariant(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function parseNonNegativeInteger(name: string): number {
  const value = Number(process.env[name]);
  invariant(Number.isInteger(value) && value >= 0, `${name} phải là số nguyên không âm.`);
  return value;
}

async function writeReport(report: Record<string, unknown>): Promise<string> {
  const outputDirectory = path.resolve(process.cwd(), "outputs", "deployment");
  await mkdir(outputDirectory, { recursive: true });
  const stem = new Date().toISOString().replace(/[:.]/g, "-") + "-" + process.pid;
  const reportPath = path.join(outputDirectory, `${stem}-rollback-rehearsal.json`);
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", {
    encoding: "utf-8",
    flag: "wx",
  });
  return reportPath;
}

async function main(): Promise<void> {
  const target = assertSafeDatabase({
    operation: "read-only",
    databaseUrl: process.env.DATABASE_URL,
  });
  invariant(
    target.databaseName === "bookverse_ai_rollback_rehearsal",
    "Rollback verifier chỉ được đọc database rollback riêng.",
  );

  const restoreExitCode = parseNonNegativeInteger("ROLLBACK_RESTORE_EXIT_CODE");
  const restoreDurationMs = parseNonNegativeInteger("ROLLBACK_RESTORE_DURATION_MS");
  const backupChecksum = process.env.PREDEPLOY_BACKUP_SHA256 ?? "";
  const sourceSchemaChecksum = process.env.PREDEPLOY_SCHEMA_NORMALIZED_SHA256 ?? "";
  const rollbackSchemaChecksum = process.env.ROLLBACK_SCHEMA_NORMALIZED_SHA256 ?? "";
  invariant(/^[a-f0-9]{64}$/.test(backupChecksum), "Thiếu SHA-256 hợp lệ của backup.");
  invariant(/^[a-f0-9]{64}$/.test(sourceSchemaChecksum), "Thiếu checksum schema nguồn hợp lệ.");
  invariant(/^[a-f0-9]{64}$/.test(rollbackSchemaChecksum), "Thiếu checksum schema rollback hợp lệ.");

  const client = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  try {
    const [
      users,
      categories,
      books,
      listings,
      orders,
      orderItems,
      successfulMigrations,
      newColumns,
      vectorExtension,
      catalog,
      categoryFilter,
      orphanBooks,
      orphanOrderItems,
      recommendationRows,
    ] = await Promise.all([
      client.user.count(),
      client.category.count(),
      client.book.count(),
      client.listing.count(),
      client.order.count(),
      client.orderItem.count(),
      client.$queryRawUnsafe<CountRow[]>(`
        SELECT COUNT(*)::int AS value FROM "_prisma_migrations"
        WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
      `),
      client.$queryRawUnsafe<CountRow[]>(`
        SELECT COUNT(*)::int AS value
        FROM information_schema.columns
        WHERE table_schema = 'public' AND (
          (table_name = 'Category' AND column_name IN ('parentId', 'level', 'canonicalKey', 'canonicalName'))
          OR (table_name = 'Listing' AND column_name IN ('stock', 'soldAt'))
          OR (table_name = 'Order' AND column_name = 'checkoutKey')
        )
      `),
      client.$queryRawUnsafe<CountRow[]>(`
        SELECT COUNT(*)::int AS value FROM pg_extension WHERE extname = 'vector'
      `),
      client.$queryRawUnsafe<CountRow[]>(`
        SELECT COUNT(*)::int AS value
        FROM "Book" b JOIN "Category" c ON c.id = b."categoryId"
        WHERE b.status = 'ACTIVE'
      `),
      client.$queryRawUnsafe<CountRow[]>(`
        SELECT COUNT(*)::int AS value FROM "Book" WHERE "categoryId" = 'C001'
      `),
      client.$queryRawUnsafe<CountRow[]>(`
        SELECT COUNT(*)::int AS value FROM "Book" b
        LEFT JOIN "Category" c ON c.id = b."categoryId" WHERE c.id IS NULL
      `),
      client.$queryRawUnsafe<CountRow[]>(`
        SELECT COUNT(*)::int AS value FROM "OrderItem" oi
        LEFT JOIN "Order" o ON o.id = oi."orderId"
        LEFT JOIN "Book" b ON b.id = oi."bookId"
        WHERE o.id IS NULL OR b.id IS NULL
      `),
      client.$queryRawUnsafe<RecommendationRow[]>(`
        SELECT
          b.id AS "bookId",
          b."categoryId" AS "categoryId",
          COALESCE(
            NULLIF(NULLIF(to_jsonb(c)->>'canonicalKey', ''), 'unmapped'),
            NULLIF(to_jsonb(c)->>'parentId', ''),
            b."categoryId"
          ) AS "featureCategoryId",
          COALESCE(
            CASE WHEN COALESCE(to_jsonb(c)->>'canonicalKey', 'unmapped') <> 'unmapped'
              THEN NULLIF(to_jsonb(c)->>'canonicalName', '') END,
            pc.name,
            c.name
          ) AS "categoryName"
        FROM "Book" b
        JOIN "Category" c ON c.id = b."categoryId"
        LEFT JOIN "Category" pc ON pc.id = NULLIF(to_jsonb(c)->>'parentId', '')
        ORDER BY b.id
      `),
    ]);

    const actualCounts = { users, categories, books, listings, orders, orderItems };
    const blockers: string[] = [];
    if (JSON.stringify(actualCounts) !== JSON.stringify(EXPECTED_COUNTS)) {
      blockers.push("Count sau rollback khác backup pre-deployment.");
    }
    if (restoreExitCode !== 0) blockers.push(`pg_restore trả exit code ${restoreExitCode}.`);
    if (sourceSchemaChecksum !== rollbackSchemaChecksum) {
      blockers.push("Schema-only dump chuẩn hóa sau rollback khác schema pre-deployment.");
    }
    if (successfulMigrations[0]?.value !== 5) blockers.push("Lịch sử migration legacy không còn đúng 5 row.");
    if (newColumns[0]?.value !== 0) blockers.push("Rollback còn sót cột Category/stock/checkout mới.");
    if (vectorExtension[0]?.value !== 0) blockers.push("Rollback còn extension vector không có trong backup.");
    if (catalog[0]?.value !== EXPECTED_COUNTS.books) blockers.push("Legacy catalog query không trả đủ Book.");
    if (categoryFilter[0]?.value !== 50) blockers.push("Legacy Category filter C001 không trả đúng 50 Book.");
    if ((orphanBooks[0]?.value ?? -1) !== 0 || (orphanOrderItems[0]?.value ?? -1) !== 0) {
      blockers.push("Rollback có foreign-key orphan.");
    }
    if (
      recommendationRows.length !== EXPECTED_COUNTS.books ||
      recommendationRows.some(
        (row) => row.featureCategoryId !== row.categoryId || !row.categoryName,
      )
    ) {
      blockers.push("Recommendation fallback trên schema legacy không hoạt động.");
    }

    const report = {
      status: blockers.length === 0 ? "PASS" : "BLOCKED",
      databaseName: target.databaseName,
      restore: {
        exitCode: restoreExitCode,
        durationMs: restoreDurationMs,
        backupChecksum,
      },
      schema: {
        sourceNormalizedChecksum: sourceSchemaChecksum,
        rollbackNormalizedChecksum: rollbackSchemaChecksum,
        matches: sourceSchemaChecksum === rollbackSchemaChecksum,
        newColumnCount: newColumns[0]?.value ?? -1,
        vectorExtensionCount: vectorExtension[0]?.value ?? -1,
        successfulMigrationCount: successfulMigrations[0]?.value ?? -1,
      },
      counts: actualCounts,
      smoke: {
        catalogBookCount: catalog[0]?.value ?? -1,
        categoryC001BookCount: categoryFilter[0]?.value ?? -1,
        recommendationRowCount: recommendationRows.length,
        recommendationUsesLegacyFallback: recommendationRows.every(
          (row) => row.featureCategoryId === row.categoryId && Boolean(row.categoryName),
        ),
        orphanBooks: orphanBooks[0]?.value ?? -1,
        orphanOrderItems: orphanOrderItems[0]?.value ?? -1,
      },
      blockers,
    };
    const reportPath = await writeReport(report);
    console.log("[REPORT] " + path.relative(process.cwd(), reportPath));
    console.log(JSON.stringify(report, null, 2));
    if (blockers.length > 0) throw new Error("Rollback rehearsal còn blocker.");
  } finally {
    await client.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Lỗi không xác định.";
  console.error("[FAIL] " + message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[DATABASE_URL_REDACTED]"));
  process.exitCode = 1;
});
