import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { validateParentAssignments } from "@/lib/category-hierarchy";
import {
  buildCategoryProfileFingerprint,
  detectCategoryProfile,
  loadCategoryProfiles,
} from "@/lib/category-profiles";
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

interface RecommendationSmokeRow {
  bookId: string;
  originalCategoryId: string;
  featureCategoryId: string;
  categoryName: string;
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

async function getIdentityAndRelationSnapshot(client: PrismaClient) {
  const [categories, bookRelations] = await Promise.all([
    client.category.findMany({
      orderBy: { id: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    client.book.findMany({
      orderBy: { id: "asc" },
      select: { id: true, categoryId: true },
    }),
  ]);
  return {
    categories,
    identityChecksum: buildCategoryProfileFingerprint(categories),
    bookRelations,
    relationChecksum: createHash("sha256")
      .update(JSON.stringify(bookRelations))
      .digest("hex"),
  };
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
    const [
      demoCounts,
      rehearsalCounts,
      demoIdentity,
      rehearsalIdentity,
      stockStats,
      approvedWithoutStock,
      schemaColumns,
      categories,
    ] = await Promise.all([
      getCounts(demo),
      getCounts(rehearsal),
      getIdentityAndRelationSnapshot(demo),
      getIdentityAndRelationSnapshot(rehearsal),
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
      rehearsal.category.findMany({
        orderBy: { id: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          parentId: true,
          level: true,
          canonicalKey: true,
          canonicalName: true,
        },
      }),
    ]);
    const [
      stockConstraint,
      stockIndex,
      checkoutUnique,
      migrationCount,
      orphanBooks,
      orphanOrderItems,
      catalogRows,
      categoryFilterRows,
      marketplaceRows,
      recommendationRows,
    ] =
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
        rehearsal.$queryRawUnsafe<CountRow[]>(`
          SELECT COUNT(*)::int AS value
          FROM "Book" b JOIN "Category" c ON c.id = b."categoryId"
          WHERE b.status = 'ACTIVE'
        `),
        rehearsal.$queryRawUnsafe<CountRow[]>(`
          SELECT COUNT(*)::int AS value FROM "Book" WHERE "categoryId" = 'C001'
        `),
        rehearsal.$queryRawUnsafe<CountRow[]>(`
          SELECT COUNT(*)::int AS value FROM "Listing"
          WHERE status = 'APPROVED' AND stock > 0
        `),
        rehearsal.$queryRawUnsafe<RecommendationSmokeRow[]>(`
          SELECT
            b.id AS "bookId",
            b."categoryId" AS "originalCategoryId",
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
    const profiles = await loadCategoryProfiles();
    const detectedProfile = detectCategoryProfile(categories, profiles);
    const categoryBackfilled = categories.filter(
      (category) => category.canonicalKey && category.canonicalName,
    ).length;
    const roots = categories.filter((category) => category.parentId === null);
    const children = categories.filter((category) => category.parentId !== null);
    const unmapped = categories.filter(
      (category) => !category.canonicalKey || !category.canonicalName || category.canonicalKey === "unmapped",
    );
    const hierarchy = validateParentAssignments(categories);

    const blockers: string[] = [];
    if (JSON.stringify(demoCounts) !== JSON.stringify(rehearsalCounts)) {
      blockers.push("Count clone sau cleanup không còn giống database demo.");
    }
    if (demoIdentity.identityChecksum !== rehearsalIdentity.identityChecksum) {
      blockers.push("Checksum ID/name/slug Category khác database demo.");
    }
    if (demoIdentity.relationChecksum !== rehearsalIdentity.relationChecksum) {
      blockers.push("Book–Category relationship khác database demo.");
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
    if (catalogRows[0]?.value !== rehearsalCounts.books) {
      blockers.push("Catalog query không trả đủ Book ACTIVE có Category.");
    }
    if (categoryFilterRows[0]?.value !== 50) {
      blockers.push(`Category filter C001 phải trả 50 Book, thực tế ${categoryFilterRows[0]?.value}.`);
    }
    if ((marketplaceRows[0]?.value ?? 0) < 1) {
      blockers.push("Marketplace không còn listing APPROVED có stock > 0.");
    }
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    if (
      recommendationRows.length !== rehearsalCounts.books ||
      recommendationRows.some((row) => {
        const category = categoryById.get(row.originalCategoryId);
        return !category || row.featureCategoryId !== category.canonicalKey || !row.categoryName;
      })
    ) {
      blockers.push("Recommendation Category query không ưu tiên canonical hoặc làm mất Book.");
    }
    if (categoryBackfilled !== rehearsalCounts.categories) {
      blockers.push(
        `Category backfill chưa tương thích clone legacy: ${categoryBackfilled}/${rehearsalCounts.categories} category có canonical mapping.`,
      );
    }
    if (detectedProfile.profile.profileName !== "legacy-demo-24") {
      blockers.push(`Sai Category profile: ${detectedProfile.profile.profileName}.`);
    }
    if (roots.length !== 24 || children.length !== 0) {
      blockers.push(`Legacy hierarchy phải có 24 root/0 child, thực tế ${roots.length}/${children.length}.`);
    }
    if (unmapped.length !== 0) blockers.push(`Còn ${unmapped.length} Category chưa map canonical.`);
    if (
      hierarchy.orphans.length > 0 ||
      hierarchy.cycles.length > 0 ||
      hierarchy.selfParents.length > 0 ||
      hierarchy.levelMismatches.length > 0
    ) {
      blockers.push("Legacy hierarchy có orphan/cycle/self-parent/level mismatch.");
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
      category: {
        detectedProfile: detectedProfile.profile.profileName,
        sourceFingerprint: detectedProfile.fingerprint,
        identityChecksumMatchesDemo:
          demoIdentity.identityChecksum === rehearsalIdentity.identityChecksum,
        relationChecksumMatchesDemo:
          demoIdentity.relationChecksum === rehearsalIdentity.relationChecksum,
        demoRelationChecksum: demoIdentity.relationChecksum,
        rehearsalRelationChecksum: rehearsalIdentity.relationChecksum,
        categoryBackfilled,
        rootCount: roots.length,
        childCount: children.length,
        canonicalGroupCount: new Set(categories.map((category) => category.canonicalKey)).size,
        unmappedCount: unmapped.length,
        orphanCount: hierarchy.orphans.length,
        cycleCount: hierarchy.cycles.length,
        selfParentCount: hierarchy.selfParents.length,
        levelMismatchCount: hierarchy.levelMismatches.length,
      },
      smoke: {
        catalogBookCount: catalogRows[0]?.value ?? -1,
        categoryC001BookCount: categoryFilterRows[0]?.value ?? -1,
        marketplaceVisibleCount: marketplaceRows[0]?.value ?? -1,
        recommendationRowCount: recommendationRows.length,
        recommendationUsesCanonical: recommendationRows.every((row) => {
          const category = categoryById.get(row.originalCategoryId);
          return Boolean(category && row.featureCategoryId === category.canonicalKey && row.categoryName);
        }),
      },
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
