import fs from "node:fs/promises";
import path from "node:path";

import { Prisma, PrismaClient } from "@prisma/client";

import { assertSafeDatabase } from "@/lib/database-safety";
import type { GoldCatalogRecord } from "@/lib/gold-catalog";

type Mode = "dry-run" | "execute";

const root = process.cwd();
const artifactPath = path.join(root, "data", "gold-catalog-v1", "normalized", "pilot-300.json");

function parseMode(): Mode {
  const modes = process.argv.slice(2).filter((arg): arg is `--${Mode}` => arg === "--dry-run" || arg === "--execute");
  if (modes.length !== 1) throw new Error("GOLD_IMPORT_MODE_REQUIRED: dùng đúng một trong --dry-run hoặc --execute");
  return modes[0].slice(2) as Mode;
}

function arrayValue(values: string[]): Prisma.Sql {
  return values.length === 0 ? Prisma.sql`ARRAY[]::text[]` : Prisma.sql`ARRAY[${Prisma.join(values.map((value) => Prisma.sql`${value}`))}]::text[]`;
}

function recordValues(record: GoldCatalogRecord): Prisma.Sql {
  return Prisma.sql`(
    ${record.catalogId}, ${record.recordType}, ${record.title}, ${record.subtitle}, ${arrayValue(record.authors)}, ${record.description},
    ${record.language}, ${record.publisher}, ${record.publishedDate}, ${record.publishedYear}, ${record.isbn10}, ${record.isbn13}, ${record.pageCount},
    ${arrayValue(record.sourceCategories)}, ${arrayValue(record.canonicalCategoryKeys)}, ${record.coverUrl}, ${record.coverProvider}, ${record.coverFinalUrl},
    ${record.coverWidth}, ${record.coverHeight}, ${record.coverHttpStatus}, ${record.coverContentType}, ${record.coverTechnicalStatus}, ${record.coverRightsStatus},
    ${record.provider}, ${record.providerBookId}, ${record.providerWorkId}, ${record.providerEditionId}, ${record.sourceUrl}, ${new Date(record.retrievedAt)},
    ${record.rawChecksum}, ${record.normalizedChecksum}, ${record.metadataQualityScore}, ${record.qualityTier}, ${arrayValue(record.rejectionReasons)}, NOW(), NOW()
  )`;
}

const columns = [
  "catalogId", "recordType", "title", "subtitle", "authors", "description", "language", "publisher", "publishedDate", "publishedYear",
  "isbn10", "isbn13", "pageCount", "sourceCategories", "canonicalCategoryKeys", "coverUrl", "coverProvider", "coverFinalUrl", "coverWidth",
  "coverHeight", "coverHttpStatus", "coverContentType", "coverTechnicalStatus", "coverRightsStatus", "provider", "providerBookId", "providerWorkId",
  "providerEditionId", "sourceUrl", "retrievedAt", "rawChecksum", "normalizedChecksum", "metadataQualityScore", "qualityTier", "rejectionReasons", "createdAt", "updatedAt",
];

async function main(): Promise<void> {
  const mode = parseMode();
  const databaseUrl = process.env.GOLD_CATALOG_DATABASE_URL;
  const allowedDatabases = process.env.GOLD_CATALOG_ALLOWED_DATABASES ?? "bookverse_ai_test,bookverse_ai_gold_pilot_clone";
  const target = assertSafeDatabase({ operation: mode === "execute" ? "destructive" : "read-only", databaseUrl, allowedDatabases });
  if (!/(?:_test$|_clone$)/u.test(target.databaseName)) throw new Error(`GOLD_IMPORT_UNSAFE_DATABASE:${target.databaseName}`);
  const records = JSON.parse(await fs.readFile(artifactPath, "utf8")) as GoldCatalogRecord[];
  if (records.length !== 300) throw new Error(`GOLD_IMPORT_ARTIFACT_COUNT:${records.length}`);
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    const tableRows = await prisma.$queryRaw<Array<{ exists: string | null }>>`SELECT to_regclass('public.gold_catalog_records')::text AS exists`;
    if (!tableRows[0]?.exists) throw new Error("GOLD_TABLE_MISSING: apply migration only on test/clone first");
    const before = await prisma.$queryRaw<Array<{ count: bigint; books: bigint; listings: bigint; orders: bigint; reviews: bigint; interactions: bigint }>>`
      SELECT
        (SELECT COUNT(*) FROM gold_catalog_records) AS count,
        (SELECT COUNT(*) FROM "Book") AS books,
        (SELECT COUNT(*) FROM "Listing") AS listings,
        (SELECT COUNT(*) FROM "Order") AS orders,
        (SELECT COUNT(*) FROM "Review") AS reviews,
        (SELECT COUNT(*) FROM "Interaction") AS interactions
    `;
    const existing = await prisma.$queryRaw<Array<{ catalogId: string }>>`SELECT "catalogId" FROM gold_catalog_records WHERE "catalogId" = ANY(${records.map((record) => record.catalogId)})`;
    const existingIds = new Set(existing.map((row) => row.catalogId));
    const actions = { INSERT: records.filter((record) => !existingIds.has(record.catalogId)).length, UPDATE: records.filter((record) => existingIds.has(record.catalogId)).length };
    if (mode === "execute") {
      await prisma.$transaction(async (tx) => {
        for (const record of records) {
          await tx.$executeRaw(Prisma.sql`
            INSERT INTO "gold_catalog_records" (${Prisma.raw(columns.map((column) => `"${column}"`).join(", "))})
            VALUES ${recordValues(record)}
            ON CONFLICT ("catalogId") DO UPDATE SET
              "recordType" = EXCLUDED."recordType", "title" = EXCLUDED."title", "subtitle" = EXCLUDED."subtitle", "authors" = EXCLUDED."authors",
              "description" = EXCLUDED."description", "language" = EXCLUDED."language", "publisher" = EXCLUDED."publisher", "publishedDate" = EXCLUDED."publishedDate",
              "publishedYear" = EXCLUDED."publishedYear", "isbn10" = EXCLUDED."isbn10", "isbn13" = EXCLUDED."isbn13", "pageCount" = EXCLUDED."pageCount",
              "sourceCategories" = EXCLUDED."sourceCategories", "canonicalCategoryKeys" = EXCLUDED."canonicalCategoryKeys", "coverUrl" = EXCLUDED."coverUrl",
              "coverProvider" = EXCLUDED."coverProvider", "coverFinalUrl" = EXCLUDED."coverFinalUrl", "coverWidth" = EXCLUDED."coverWidth", "coverHeight" = EXCLUDED."coverHeight",
              "coverHttpStatus" = EXCLUDED."coverHttpStatus", "coverContentType" = EXCLUDED."coverContentType", "coverTechnicalStatus" = EXCLUDED."coverTechnicalStatus",
              "coverRightsStatus" = EXCLUDED."coverRightsStatus", "provider" = EXCLUDED."provider", "providerBookId" = EXCLUDED."providerBookId", "providerWorkId" = EXCLUDED."providerWorkId",
              "providerEditionId" = EXCLUDED."providerEditionId", "sourceUrl" = EXCLUDED."sourceUrl", "retrievedAt" = EXCLUDED."retrievedAt", "rawChecksum" = EXCLUDED."rawChecksum",
              "normalizedChecksum" = EXCLUDED."normalizedChecksum", "metadataQualityScore" = EXCLUDED."metadataQualityScore", "qualityTier" = EXCLUDED."qualityTier",
              "rejectionReasons" = EXCLUDED."rejectionReasons", "updatedAt" = NOW()
          `);
        }
      });
    }
    const after = await prisma.$queryRaw<Array<{ count: bigint; books: bigint; listings: bigint; orders: bigint; reviews: bigint; interactions: bigint }>>`
      SELECT
        (SELECT COUNT(*) FROM gold_catalog_records) AS count,
        (SELECT COUNT(*) FROM "Book") AS books,
        (SELECT COUNT(*) FROM "Listing") AS listings,
        (SELECT COUNT(*) FROM "Order") AS orders,
        (SELECT COUNT(*) FROM "Review") AS reviews,
        (SELECT COUNT(*) FROM "Interaction") AS interactions
    `;
    const beforeCounts = Object.fromEntries(Object.entries(before[0]).map(([key, value]) => [key, Number(value)]));
    const afterCounts = Object.fromEntries(Object.entries(after[0]).map(([key, value]) => [key, Number(value)]));
    const nonGoldUnchanged = ["books", "listings", "orders", "reviews", "interactions"].every((key) => beforeCounts[key] === afterCounts[key]);
    if (!nonGoldUnchanged) throw new Error("GOLD_IMPORT_NON_GOLD_COUNT_DRIFT");
    process.stdout.write(`${JSON.stringify({ status: "VERIFIED", mode, database: target.databaseName, artifactCount: records.length, actions, before: beforeCounts, after: afterCounts, nonGoldUnchanged }, null, 2)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
