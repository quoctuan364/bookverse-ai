import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { assertSafeDatabase } from "@/lib/database-safety";

interface CountRow {
  value: number;
}

interface TextRow {
  value: string;
}

interface VectorRow {
  distance: number;
}

const ROLLBACK_SENTINEL = "BOOKVERSE_FRESH_SMOKE_ROLLBACK";

function invariant(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function scalarCount(client: PrismaClient, sql: string): Promise<number> {
  const rows = await client.$queryRawUnsafe<CountRow[]>(sql);
  return rows[0]?.value ?? -1;
}

async function writeReport(report: Record<string, unknown>): Promise<string> {
  const directory = path.resolve(process.cwd(), "outputs", "deployment");
  await mkdir(directory, { recursive: true });
  const stem = new Date().toISOString().replace(/[:.]/g, "-") + "-" + process.pid;
  const reportPath = path.join(directory, `${stem}-fresh-migration-verifier.json`);
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", {
    encoding: "utf-8",
    flag: "wx",
  });
  return reportPath;
}

async function main(): Promise<void> {
  const target = assertSafeDatabase({ operation: "destructive", databaseUrl: process.env.DATABASE_URL });
  invariant(
    target.databaseName === "bookverse_ai_fresh_migration_test",
    "Fresh verifier chỉ được chạy trên bookverse_ai_fresh_migration_test.",
  );
  const client = new PrismaClient();
  try {
    const [migrationCount, failedMigrationCount, vectorExtension, categoryColumns, categoryIndexes] =
      await Promise.all([
        scalarCount(
          client,
          `SELECT COUNT(*)::int AS value FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
        ),
        scalarCount(
          client,
          `SELECT COUNT(*)::int AS value FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL`,
        ),
        scalarCount(client, `SELECT COUNT(*)::int AS value FROM pg_extension WHERE extname = 'vector'`),
        scalarCount(
          client,
          `SELECT COUNT(*)::int AS value FROM information_schema.columns WHERE table_schema='public' AND table_name='Category' AND column_name IN ('parentId','level','canonicalKey','canonicalName')`,
        ),
        scalarCount(
          client,
          `SELECT COUNT(*)::int AS value FROM pg_indexes WHERE schemaname='public' AND indexname IN ('Category_parentId_idx','Category_level_idx','Category_canonicalKey_idx')`,
        ),
      ]);
    const [embeddingTypeRows, stockConstraint, stockIndex, checkoutUnique, categoryFk] =
      await Promise.all([
        client.$queryRawUnsafe<TextRow[]>(`
          SELECT format_type(a.atttypid, a.atttypmod) AS value
          FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
          JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='public' AND c.relname='book_embeddings' AND a.attname='embedding'
        `),
        scalarCount(client, `SELECT COUNT(*)::int AS value FROM pg_constraint WHERE conname='Listing_stock_non_negative'`),
        scalarCount(client, `SELECT COUNT(*)::int AS value FROM pg_indexes WHERE schemaname='public' AND indexname='Listing_status_stock_idx'`),
        scalarCount(client, `SELECT COUNT(*)::int AS value FROM pg_indexes WHERE schemaname='public' AND indexname='Order_buyerId_checkoutKey_key'`),
        scalarCount(client, `SELECT COUNT(*)::int AS value FROM pg_constraint WHERE conname='Category_parentId_fkey'`),
      ]);

    invariant(migrationCount === 11, `Phải có 11 migration thành công, thực tế ${migrationCount}.`);
    invariant(failedMigrationCount === 0, `Còn ${failedMigrationCount} migration failed/pending.`);
    invariant(vectorExtension === 1, "Thiếu extension vector.");
    invariant(embeddingTypeRows[0]?.value === "vector", "book_embeddings.embedding không phải vector.");
    invariant(categoryColumns === 4 && categoryIndexes === 3 && categoryFk === 1, "Category schema chưa đủ.");
    invariant(stockConstraint === 1 && stockIndex === 1 && checkoutUnique === 1, "Stock/checkout schema chưa đủ.");

    try {
      await client.$transaction(async (tx) => {
        await tx.user.create({ data: { id: "FRESH-USER", name: "Fresh migration smoke" } });
        await tx.category.create({
          data: {
            id: "FRESH-CATEGORY",
            name: "Fresh migration category",
            slug: "fresh-migration-category",
            level: 0,
            canonicalKey: "technology",
            canonicalName: "Công nghệ",
          },
        });
        await tx.book.create({
          data: {
            id: "FRESH-BOOK",
            title: "Fresh migration book",
            slug: "fresh-migration-book",
            authorName: "BookVerse",
            price: "100000",
            categoryId: "FRESH-CATEGORY",
          },
        });
        await tx.listing.create({
          data: {
            id: "FRESH-LISTING",
            sellerId: "FRESH-USER",
            bookId: "FRESH-BOOK",
            title: "Fresh migration listing",
            price: "90000",
            status: "APPROVED",
            stock: 1,
          },
        });
        await tx.$executeRawUnsafe(`
          INSERT INTO "book_embeddings" ("id","bookId","content","embedding","model","createdAt","updatedAt")
          VALUES ('FRESH-EMBEDDING','FRESH-BOOK','smoke','[1,2,3]'::vector,'smoke',NOW(),NOW())
        `);
        const vectorRows = await tx.$queryRawUnsafe<VectorRow[]>(`
          SELECT (embedding <=> '[1,2,3]'::vector)::float8 AS distance
          FROM "book_embeddings" WHERE id='FRESH-EMBEDDING'
        `);
        invariant(Math.abs(vectorRows[0]?.distance ?? 1) < 1e-9, "Prisma vector smoke sai distance.");
        const listing = await tx.listing.findUniqueOrThrow({ where: { id: "FRESH-LISTING" } });
        invariant(listing.stock === 1, "Prisma smoke không đọc đúng stock.");
        throw new Error(ROLLBACK_SENTINEL);
      });
    } catch (error) {
      if (!(error instanceof Error) || error.message !== ROLLBACK_SENTINEL) throw error;
    }
    const fixtureCount = await scalarCount(
      client,
      `SELECT (
        (SELECT COUNT(*) FROM "User" WHERE id='FRESH-USER') +
        (SELECT COUNT(*) FROM "Category" WHERE id='FRESH-CATEGORY') +
        (SELECT COUNT(*) FROM "Book" WHERE id='FRESH-BOOK') +
        (SELECT COUNT(*) FROM "Listing" WHERE id='FRESH-LISTING') +
        (SELECT COUNT(*) FROM "book_embeddings" WHERE id='FRESH-EMBEDDING')
      )::int AS value`,
    );
    invariant(fixtureCount === 0, "Fresh smoke fixture không rollback hoàn toàn.");

    const report = {
      status: "PASS",
      databaseName: target.databaseName,
      migrationCount,
      failedMigrationCount,
      vector: { extension: vectorExtension, embeddingColumnType: embeddingTypeRows[0]?.value },
      category: { columns: categoryColumns, indexes: categoryIndexes, selfForeignKey: categoryFk },
      stock: { nonNegativeConstraint: stockConstraint, statusStockIndex: stockIndex },
      checkout: { idempotencyUnique: checkoutUnique },
      prismaSmoke: { status: "PASS", transactionRolledBack: true, fixtureCount },
    };
    const reportPath = await writeReport(report);
    console.log("[REPORT] " + path.relative(process.cwd(), reportPath));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Lỗi fresh verifier không xác định.";
  console.error("[FAIL] " + message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[DATABASE_URL_REDACTED]"));
  process.exitCode = 1;
});
