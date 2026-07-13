import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { assertSafeDatabase } from "@/lib/database-safety";

interface TableCounts {
  users: number;
  categories: number;
  books: number;
  listings: number;
  orders: number;
  orderItems: number;
}

interface CountRow {
  value: number;
}

function invariant(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function getCounts(client: PrismaClient): Promise<TableCounts> {
  const [users, categories, books, listings, orders, orderItems] = await Promise.all([
    client.user.count(),
    client.category.count(),
    client.book.count(),
    client.listing.count(),
    client.order.count(),
    client.orderItem.count(),
  ]);
  return { users, categories, books, listings, orders, orderItems };
}

async function writeReport(report: Record<string, unknown>): Promise<string> {
  const outputDirectory = path.resolve(process.cwd(), "outputs", "stock");
  await mkdir(outputDirectory, { recursive: true });
  const stem = new Date().toISOString().replace(/[:.]/g, "-") + "-" + process.pid;
  const reportPath = path.join(outputDirectory, `${stem}-deployment-rehearsal.json`);
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", {
    encoding: "utf-8",
    flag: "wx",
  });
  return reportPath;
}

async function main(): Promise<void> {
  const rehearsalUrl = process.env.DATABASE_URL;
  const demoUrl = process.env.DEMO_DATABASE_URL;
  const rehearsalTarget = assertSafeDatabase({ operation: "read-only", databaseUrl: rehearsalUrl });
  const demoTarget = assertSafeDatabase({ operation: "read-only", databaseUrl: demoUrl });
  invariant(
    rehearsalTarget.databaseName === "bookverse_ai_deploy_rehearsal",
    "Verifier chỉ được đọc database rehearsal.",
  );
  invariant(demoTarget.databaseName === "bookverse_ai", "Nguồn so sánh phải là database demo read-only.");

  const rehearsal = new PrismaClient({ datasources: { db: { url: rehearsalUrl } } });
  const demo = new PrismaClient({ datasources: { db: { url: demoUrl } } });
  try {
    const [demoCounts, rehearsalCounts, stockStats, approvedWithoutStock, schemaColumns] = await Promise.all([
      getCounts(demo),
      getCounts(rehearsal),
      rehearsal.listing.aggregate({ _min: { stock: true }, _max: { stock: true } }),
      rehearsal.listing.count({ where: { status: "APPROVED", stock: { lte: 0 } } }),
      rehearsal.$queryRawUnsafe<CountRow[]>(`
        SELECT COUNT(*)::int AS value
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND (
            (table_name = 'Listing' AND column_name IN ('stock', 'soldAt'))
            OR (table_name = 'Order' AND column_name = 'checkoutKey')
            OR (table_name = 'Category' AND column_name IN ('parentId', 'level', 'canonicalKey', 'canonicalName'))
          )
      `),
    ]);
    const [stockConstraint, stockIndex, checkoutUnique, migrationCount, orphanBooks, orphanOrderItems] =
      await Promise.all([
        rehearsal.$queryRawUnsafe<CountRow[]>(`
          SELECT COUNT(*)::int AS value FROM pg_constraint WHERE conname = 'Listing_stock_non_negative'
        `),
        rehearsal.$queryRawUnsafe<CountRow[]>(`
          SELECT COUNT(*)::int AS value FROM pg_indexes
          WHERE schemaname = 'public' AND indexname = 'Listing_status_stock_idx'
        `),
        rehearsal.$queryRawUnsafe<CountRow[]>(`
          SELECT COUNT(*)::int AS value FROM pg_indexes
          WHERE schemaname = 'public' AND indexname = 'Order_buyerId_checkoutKey_key'
        `),
        rehearsal.$queryRawUnsafe<CountRow[]>(`
          SELECT COUNT(*)::int AS value FROM "_prisma_migrations"
          WHERE migration_name IN (
            '20260712153000_add_category_hierarchy_and_canonical_fields',
            '20260713161000_add_listing_stock_checkout_safety'
          ) AND finished_at IS NOT NULL AND rolled_back_at IS NULL
        `),
        rehearsal.$queryRawUnsafe<CountRow[]>(`
          SELECT COUNT(*)::int AS value FROM "Book" b
          LEFT JOIN "Category" c ON c.id = b."categoryId" WHERE c.id IS NULL
        `),
        rehearsal.$queryRawUnsafe<CountRow[]>(`
          SELECT COUNT(*)::int AS value FROM "OrderItem" oi
          LEFT JOIN "Order" o ON o.id = oi."orderId"
          LEFT JOIN "Book" b ON b.id = oi."bookId"
          WHERE o.id IS NULL OR b.id IS NULL
        `),
      ]);
    const categoryBackfilled = await rehearsal.category.count({
      where: { canonicalKey: { not: null }, canonicalName: { not: null } },
    });

    const blockers: string[] = [];
    if (JSON.stringify(demoCounts) !== JSON.stringify(rehearsalCounts)) {
      blockers.push("Count clone sau cleanup không còn giống database demo.");
    }
    if (schemaColumns[0]?.value !== 7) blockers.push("Thiếu cột Category/stock/checkoutKey sau migration.");
    if (stockConstraint[0]?.value !== 1) blockers.push("Thiếu constraint Listing_stock_non_negative.");
    if (stockIndex[0]?.value !== 1) blockers.push("Thiếu index Listing_status_stock_idx.");
    if (checkoutUnique[0]?.value !== 1) blockers.push("Thiếu unique index idempotency checkout.");
    if (migrationCount[0]?.value !== 2) blockers.push("Category/stock migration chưa apply đủ.");
    if ((stockStats._min.stock ?? -1) < 0) blockers.push("Có stock âm.");
    if (approvedWithoutStock !== 0) blockers.push("Có listing APPROVED nhưng stock <= 0.");
    if (orphanBooks[0]?.value !== 0 || orphanOrderItems[0]?.value !== 0) {
      blockers.push("Có foreign-key orphan sau rehearsal.");
    }
    if (categoryBackfilled !== rehearsalCounts.categories) {
      blockers.push(
        `Category backfill chưa tương thích clone legacy: ${categoryBackfilled}/${rehearsalCounts.categories} category có canonical mapping.`,
      );
    }

    const report = {
      demoDatabase: demoTarget.databaseName,
      rehearsalDatabase: rehearsalTarget.databaseName,
      demoCounts,
      rehearsalCounts,
      stock: {
        min: stockStats._min.stock,
        max: stockStats._max.stock,
        approvedWithoutStock,
      },
      schema: {
        expectedColumns: schemaColumns[0]?.value ?? 0,
        stockConstraint: stockConstraint[0]?.value ?? 0,
        stockIndex: stockIndex[0]?.value ?? 0,
        checkoutUnique: checkoutUnique[0]?.value ?? 0,
        requiredMigrations: migrationCount[0]?.value ?? 0,
      },
      foreignKeys: {
        orphanBooks: orphanBooks[0]?.value ?? -1,
        orphanOrderItems: orphanOrderItems[0]?.value ?? -1,
      },
      categoryBackfilled,
      blockers,
      status: blockers.length === 0 ? "PASS" : "BLOCKED",
    };
    const reportPath = await writeReport(report);
    console.log("[REPORT] " + path.relative(process.cwd(), reportPath));
    console.log(JSON.stringify(report, null, 2));
    if (blockers.length > 0) {
      throw new Error("Deployment rehearsal còn blocker; xem report để biết chi tiết.");
    }
  } finally {
    await Promise.all([rehearsal.$disconnect(), demo.$disconnect()]);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Lỗi không xác định.";
  console.error("[FAIL] " + message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[DATABASE_URL_REDACTED]"));
  process.exitCode = 1;
});
