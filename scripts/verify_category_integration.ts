import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { validateParentAssignments, type CategoryNode } from "@/lib/category-hierarchy";
import { assertSafeDatabase } from "@/lib/database-safety";

interface CategoryRow {
  id: string;
  name: string;
  parentId: string | null;
  level: number | null;
  canonicalKey: string | null;
  canonicalName: string | null;
}

interface BookCategoryRow {
  bookId: string;
  originalCategoryId: string;
}

interface RecommendationCategoryRow extends BookCategoryRow {
  featureCategoryId: string;
  categoryName: string;
}

interface FallbackRow {
  categoryId: string;
  expectedId: string;
  resolvedId: string;
  resolvedName: string;
}

interface CountRow {
  value: number;
}

interface VerificationReport {
  testDatabase: string;
  legacyDatabase: string | null;
  categoryCount: number;
  rootCount: number;
  childCount: number;
  bookCount: number;
  catalogBookCount: number;
  relationCount: number;
  canonicalGroupCount: number;
  orphanCount: number;
  cycleCount: number;
  selfParentCount: number;
  unmappedCount: number;
  parentFallback: FallbackRow;
  originalFallback: FallbackRow;
  legacyCategoryColumnCount: number | null;
  legacyBookCount: number | null;
  checks: string[];
}

// Query tĩnh, không nhận input từ người dùng. to_jsonb(c) giúp query chạy được
// cả khi schema Category cũ chưa có parentId/canonicalKey/canonicalName.
const RECOMMENDATION_CATEGORY_QUERY = `
  SELECT
    b.id AS "bookId",
    b."categoryId" AS "originalCategoryId",
    COALESCE(
      NULLIF(NULLIF(to_jsonb(c)->>'canonicalKey', ''), 'unmapped'),
      NULLIF(to_jsonb(c)->>'parentId', ''),
      b."categoryId"
    ) AS "featureCategoryId",
    COALESCE(
      CASE
        WHEN COALESCE(to_jsonb(c)->>'canonicalKey', 'unmapped') <> 'unmapped'
        THEN NULLIF(to_jsonb(c)->>'canonicalName', '')
      END,
      pc.name,
      c.name
    ) AS "categoryName"
  FROM "Book" b
  JOIN "Category" c ON c.id = b."categoryId"
  LEFT JOIN "Category" pc ON pc.id = NULLIF(to_jsonb(c)->>'parentId', '')
  ORDER BY b.id
`;

const SYNTHETIC_RECOMMENDATION_CATEGORY_QUERY = RECOMMENDATION_CATEGORY_QUERY.replace(
  "  ORDER BY b.id",
  `  WHERE NOT EXISTS (
    SELECT 1 FROM book_source_metadata bsm WHERE bsm."bookId" = b.id
  )
  ORDER BY b.id`,
);

function invariant(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function createClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
  });
}

async function writeReport(report: VerificationReport): Promise<string> {
  const outputDirectory = path.resolve(process.cwd(), "outputs", "categories");
  await mkdir(outputDirectory, { recursive: true });
  const stem = new Date().toISOString().replace(/[:.]/g, "-") + "-" + process.pid;
  const reportPath = path.join(outputDirectory, stem + "-category-integration.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", {
    encoding: "utf-8",
    flag: "wx",
  });
  return reportPath;
}

async function main(): Promise<void> {
  const currentOnly = process.argv.includes("--current-only");
  const testDatabaseUrl = process.env.DATABASE_URL;
  const legacyDatabaseUrl = process.env.CATEGORY_LEGACY_DATABASE_URL;
  invariant(
    testDatabaseUrl !== undefined && testDatabaseUrl.length > 0,
    "Thiếu DATABASE_URL cho database test.",
  );
  if (!currentOnly) {
    invariant(
      legacyDatabaseUrl !== undefined && legacyDatabaseUrl.length > 0,
      "Thiếu CATEGORY_LEGACY_DATABASE_URL cho schema demo cũ.",
    );
  }
  const testTarget = assertSafeDatabase({
    operation: "read-only",
    databaseUrl: testDatabaseUrl,
  });
  const legacyTarget = legacyDatabaseUrl
    ? assertSafeDatabase({ operation: "read-only", databaseUrl: legacyDatabaseUrl })
    : null;

  invariant(testTarget.databaseName === "bookverse_ai_test", "Verifier chỉ được chạy hierarchy trên bookverse_ai_test.");
  if (!currentOnly) {
    invariant(legacyTarget?.databaseName === "bookverse_ai", "Legacy verifier phải trỏ tới bookverse_ai ở chế độ read-only.");
  }

  const testClient = createClient(testDatabaseUrl);
  const legacyClient = currentOnly ? null : createClient(legacyDatabaseUrl!);

  try {
    const categories = await testClient.$queryRaw<CategoryRow[]>`
      SELECT id, name, "parentId", level, "canonicalKey", "canonicalName"
      FROM "Category"
      ORDER BY id
    `;
    const books = await testClient.$queryRaw<BookCategoryRow[]>`
      SELECT id AS "bookId", "categoryId" AS "originalCategoryId"
      FROM "Book"
      WHERE NOT EXISTS (
        SELECT 1 FROM book_source_metadata bsm WHERE bsm."bookId" = "Book".id
      )
      ORDER BY id
    `;
    const catalogBooks = await testClient.$queryRaw<BookCategoryRow[]>`
      SELECT b.id AS "bookId", b."categoryId" AS "originalCategoryId"
      FROM "Book" b
      JOIN book_source_metadata bsm ON bsm."bookId" = b.id
      ORDER BY b.id
    `;
    const recommendationRows = await testClient.$queryRawUnsafe<RecommendationCategoryRow[]>(
      SYNTHETIC_RECOMMENDATION_CATEGORY_QUERY,
    );

    const categoryIds = new Set(categories.map((category) => category.id));
    const bookIds = new Set(books.map((book) => book.bookId));
    const nodes: CategoryNode[] = categories.map((category) => ({
      id: category.id,
      name: category.name,
      parentId: category.parentId,
      level: category.level,
    }));
    const hierarchy = validateParentAssignments(nodes);
    const roots = categories.filter((category) => category.parentId === null);
    const children = categories.filter((category) => category.parentId !== null);
    const unmapped = categories.filter(
      (category) => !category.canonicalKey || category.canonicalKey === "unmapped",
    );
    const canonicalGroups = new Set(categories.map((category) => category.canonicalKey));

    invariant(categories.length === 2_200, `Category phải bằng 2200, thực tế ${categories.length}.`);
    invariant(roots.length === 43, `Root phải bằng 43, thực tế ${roots.length}.`);
    invariant(children.length === 2_157, `Child phải bằng 2157, thực tế ${children.length}.`);
    invariant(books.length === 2_200, `Book phải bằng 2200, thực tế ${books.length}.`);
    invariant(catalogBooks.length === 3_046, `Catalog tuyển chọn phải bằng 3046, thực tế ${catalogBooks.length}.`);
    invariant(books.every((book) => categoryIds.has(book.originalCategoryId)), "Có Book trỏ tới Category không tồn tại.");
    invariant(catalogBooks.every((book) => categoryIds.has(book.originalCategoryId)), "Có catalog Book trỏ tới Category không tồn tại.");
    invariant(hierarchy.orphans.length === 0, "Category hierarchy có orphan.");
    invariant(hierarchy.cycles.length === 0, "Category hierarchy có cycle.");
    invariant(hierarchy.selfParents.length === 0, "Category hierarchy có self-parent.");
    invariant(hierarchy.levelMismatches.length === 0, "Category hierarchy có level không khớp.");
    invariant(unmapped.length === 0, "Category canonical còn giá trị unmapped/null.");
    invariant(canonicalGroups.size === 27, `Canonical group phải bằng 27, thực tế ${canonicalGroups.size}.`);
    invariant(recommendationRows.length === books.length, "Recommendation query làm mất Book.");
    invariant(
      recommendationRows.every((row) => bookIds.has(row.bookId) && row.categoryName.length > 0),
      "Recommendation query trả Book không tồn tại hoặc categoryName rỗng.",
    );

    const categoryById = new Map(categories.map((category) => [category.id, category]));
    for (const row of recommendationRows) {
      const category = categoryById.get(row.originalCategoryId);
      invariant(category !== undefined, `Thiếu Category cho Book ${row.bookId}.`);
      invariant(
        row.featureCategoryId === category.canonicalKey,
        `Canonical category không được ưu tiên cho Book ${row.bookId}.`,
      );
    }

    const parentFallback = await testClient.$queryRaw<FallbackRow[]>`
      WITH fixture AS (
        SELECT
          c.id,
          c.name,
          c."parentId",
          to_jsonb(c) - 'canonicalKey' - 'canonicalName' AS payload
        FROM "Category" c
        WHERE c."parentId" IS NOT NULL
        ORDER BY c.id
        LIMIT 1
      )
      SELECT
        f.id AS "categoryId",
        f."parentId" AS "expectedId",
        COALESCE(
          NULLIF(NULLIF(f.payload->>'canonicalKey', ''), 'unmapped'),
          NULLIF(f.payload->>'parentId', ''),
          f.id
        ) AS "resolvedId",
        COALESCE(
          NULLIF(f.payload->>'canonicalName', ''),
          p.name,
          f.name
        ) AS "resolvedName"
      FROM fixture f
      JOIN "Category" p ON p.id = f."parentId"
    `;
    invariant(parentFallback.length === 1, "Không tạo được fixture fallback parent.");
    invariant(
      parentFallback[0].resolvedId === parentFallback[0].expectedId,
      "Recommendation query không fallback về parent category.",
    );

    const originalFallback = await testClient.$queryRaw<FallbackRow[]>`
      WITH fixture AS (
        SELECT id, name, to_jsonb(c) - 'canonicalKey' - 'canonicalName' - 'parentId' AS payload
        FROM "Category" c
        WHERE c."parentId" IS NULL
        ORDER BY c.id
        LIMIT 1
      )
      SELECT
        f.id AS "categoryId",
        f.id AS "expectedId",
        COALESCE(
          NULLIF(NULLIF(f.payload->>'canonicalKey', ''), 'unmapped'),
          NULLIF(f.payload->>'parentId', ''),
          f.id
        ) AS "resolvedId",
        COALESCE(NULLIF(f.payload->>'canonicalName', ''), f.name) AS "resolvedName"
      FROM fixture f
    `;
    invariant(originalFallback.length === 1, "Không tạo được fixture fallback category gốc.");
    invariant(
      originalFallback[0].resolvedId === originalFallback[0].expectedId,
      "Recommendation query không fallback về category gốc.",
    );

    let legacyCategoryColumnCount: number | null = null;
    let legacyBookCount: number | null = null;
    if (legacyClient) {
      const legacyColumnRows = await legacyClient.$queryRaw<CountRow[]>`
        SELECT COUNT(*)::int AS value
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Category'
          AND column_name IN ('parentId', 'level', 'canonicalKey', 'canonicalName')
      `;
      const legacyRecommendationRows =
        await legacyClient.$queryRawUnsafe<RecommendationCategoryRow[]>(RECOMMENDATION_CATEGORY_QUERY);
      invariant(legacyColumnRows[0]?.value === 0, "Database demo không còn là legacy schema như kỳ vọng.");
      invariant(legacyRecommendationRows.length > 0, "Legacy query không trả Book nào.");
      invariant(
        legacyRecommendationRows.every(
          (row) => row.featureCategoryId === row.originalCategoryId && row.categoryName.length > 0,
        ),
        "Query tương thích schema cũ không fallback về category gốc.",
      );
      legacyCategoryColumnCount = legacyColumnRows[0].value;
      legacyBookCount = legacyRecommendationRows.length;
    }

    const report: VerificationReport = {
      testDatabase: testTarget.databaseName,
      legacyDatabase: legacyTarget?.databaseName ?? null,
      categoryCount: categories.length,
      rootCount: roots.length,
      childCount: children.length,
      bookCount: books.length,
      catalogBookCount: catalogBooks.length,
      relationCount: books.filter((book) => categoryIds.has(book.originalCategoryId)).length,
      canonicalGroupCount: canonicalGroups.size,
      orphanCount: hierarchy.orphans.length,
      cycleCount: hierarchy.cycles.length,
      selfParentCount: hierarchy.selfParents.length,
      unmappedCount: unmapped.length,
      parentFallback: parentFallback[0],
      originalFallback: originalFallback[0],
      legacyCategoryColumnCount,
      legacyBookCount,
      checks: [
        "catalog-book-category",
        "curated-catalog-category-existence",
        "root-child-hierarchy",
        "canonical-priority",
        "parent-fallback",
        "original-category-fallback",
        "book-id-existence",
        ...(legacyClient ? ["legacy-schema-compatibility"] : []),
      ],
    };
    const reportPath = await writeReport(report);
    console.log("[PASS] Category integration verifier");
    console.log("[REPORT] " + path.relative(process.cwd(), reportPath));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await testClient.$disconnect();
    if (legacyClient) {
      await legacyClient.$disconnect();
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Lỗi integration không xác định.";
  console.error("[FAIL] " + message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[DATABASE_URL_REDACTED]"));
  process.exitCode = 1;
});
