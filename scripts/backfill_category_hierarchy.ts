import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import prisma from "@/lib/prisma";
import { validateParentAssignments, type CategoryNode } from "@/lib/category-hierarchy";
import { loadCategoryMapping } from "@/lib/category-mapping-file";
import { assertSafeDatabase } from "@/lib/database-safety";

interface BackfillOptions {
  mode: "dry-run" | "execute";
}

interface BackfillPlan {
  parentUpdates: number;
  levelUpdates: number;
  canonicalUpdates: number;
  categoriesNotFound: string[];
  mappingsNotFound: string[];
  missingParents: string[];
  cycleCount: number;
  selfParentCount: number;
  levelMismatchCount: number;
  unchanged: number;
  changed: number;
}

function parseOptions(args: string[]): BackfillOptions {
  const dryRun = args.includes("--dry-run");
  const execute = args.includes("--execute");
  const unknownFlags = args.filter(
    (argument) => argument.startsWith("--") && !["--dry-run", "--execute"].includes(argument),
  );

  if (unknownFlags.length > 0) {
    throw new Error("Flag không được hỗ trợ: " + unknownFlags.join(", "));
  }
  if (dryRun === execute) {
    throw new Error("Phải chọn chính xác một mode: --dry-run hoặc --execute.");
  }
  return { mode: dryRun ? "dry-run" : "execute" };
}

function checksumSnapshot(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function getDatabaseSnapshot() {
  const [categories, bookCount, relationCount] = await Promise.all([
    prisma.category.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        parentId: true,
        level: true,
        canonicalKey: true,
        canonicalName: true,
      },
    }),
    prisma.book.count(),
    prisma.book.count({ where: { categoryId: { not: "" } } }),
  ]);
  return {
    categories,
    categoryCount: categories.length,
    bookCount,
    relationCount,
    checksum: checksumSnapshot(categories),
  };
}

async function writeBackfillReport(report: Record<string, unknown>, mode: string): Promise<string> {
  const outputDirectory = path.resolve(process.cwd(), "outputs", "categories");
  await mkdir(outputDirectory, { recursive: true });
  const stem = new Date().toISOString().replace(/[:.]/g, "-") + "-" + process.pid;
  const reportPath = path.join(outputDirectory, stem + "-backfill-" + mode + ".json");
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", {
    encoding: "utf-8",
    flag: "wx",
  });
  return reportPath;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const startedAt = new Date();
  const databaseTarget = assertSafeDatabase({
    operation: options.mode === "execute" ? "destructive" : "read-only",
    databaseUrl: process.env.DATABASE_URL,
  });
  const mapping = await loadCategoryMapping();
  const before = await getDatabaseSnapshot();
  const databaseIds = new Set(before.categories.map((category) => category.id));
  const mappingIds = new Set(mapping.file.entries.map((entry) => entry.categoryId));
  const nodes: CategoryNode[] = mapping.file.entries.map((entry) => ({
    id: entry.categoryId,
    name: entry.categoryName,
    parentId: entry.parentId,
    level: entry.level,
  }));
  const hierarchyValidation = validateParentAssignments(nodes);
  const categoriesNotFound = mapping.file.entries
    .filter((entry) => !databaseIds.has(entry.categoryId))
    .map((entry) => entry.categoryId);
  const mappingsNotFound = before.categories
    .filter((category) => !mappingIds.has(category.id))
    .map((category) => category.id);
  const missingParents = mapping.file.entries
    .filter((entry) => entry.parentId && !databaseIds.has(entry.parentId))
    .map((entry) => entry.categoryId);
  const currentById = new Map(before.categories.map((category) => [category.id, category]));
  let parentUpdates = 0;
  let levelUpdates = 0;
  let canonicalUpdates = 0;
  let unchanged = 0;
  const changedEntries = [];

  for (const entry of mapping.file.entries) {
    const current = currentById.get(entry.categoryId);
    if (!current) {
      continue;
    }
    const parentChanged = current.parentId !== entry.parentId;
    const levelChanged = current.level !== entry.level;
    const canonicalChanged =
      current.canonicalKey !== entry.canonicalKey ||
      current.canonicalName !== entry.canonicalName;
    parentUpdates += parentChanged ? 1 : 0;
    levelUpdates += levelChanged ? 1 : 0;
    canonicalUpdates += canonicalChanged ? 1 : 0;

    if (parentChanged || levelChanged || canonicalChanged) {
      changedEntries.push(entry);
    } else {
      unchanged += 1;
    }
  }

  const plan: BackfillPlan = {
    parentUpdates,
    levelUpdates,
    canonicalUpdates,
    categoriesNotFound,
    mappingsNotFound,
    missingParents,
    cycleCount: hierarchyValidation.cycles.length,
    selfParentCount: hierarchyValidation.selfParents.length,
    levelMismatchCount: hierarchyValidation.levelMismatches.length,
    unchanged,
    changed: changedEntries.length,
  };
  const hasCriticalError =
    categoriesNotFound.length > 0 ||
    mappingsNotFound.length > 0 ||
    missingParents.length > 0 ||
    hierarchyValidation.orphans.length > 0 ||
    hierarchyValidation.cycles.length > 0 ||
    hierarchyValidation.selfParents.length > 0 ||
    hierarchyValidation.levelMismatches.length > 0;

  console.log("[DATABASE] " + databaseTarget.maskedUrl);
  console.log("[MAPPING] SHA-256 " + mapping.mappingChecksum);
  console.log("[PLAN] " + JSON.stringify(plan));

  if (hasCriticalError) {
    throw new Error("Category backfill preflight failed; no database writes were executed.");
  }

  if (options.mode === "execute" && changedEntries.length > 0) {
    // Guard được kiểm tra lại ngay trước transaction ghi.
    assertSafeDatabase({
      operation: "destructive",
      databaseUrl: process.env.DATABASE_URL,
    });
    await prisma.$transaction(
      async (tx) => {
        for (const entry of changedEntries) {
          await tx.category.update({
            where: { id: entry.categoryId },
            data: {
              parentId: entry.parentId,
              level: entry.level,
              canonicalKey: entry.canonicalKey,
              canonicalName: entry.canonicalName,
            },
          });
        }
      },
      {
        maxWait: 10_000,
        timeout: 120_000,
      },
    );
  }

  const after = await getDatabaseSnapshot();
  if (
    before.categoryCount !== after.categoryCount ||
    before.bookCount !== after.bookCount ||
    before.relationCount !== after.relationCount
  ) {
    throw new Error("Backfill invariant failed: category/book/relation counts changed.");
  }
  if (options.mode === "dry-run" && before.checksum !== after.checksum) {
    throw new Error("Dry-run safety assertion failed: Category rows changed.");
  }

  const finishedAt = new Date();
  const report = {
    mode: options.mode,
    databaseName: databaseTarget.databaseName,
    mappingFile: path.relative(process.cwd(), mapping.mappingPath).replace(/\\/g, "/"),
    mappingChecksum: mapping.mappingChecksum,
    sourceChecksum: mapping.file.sourceChecksum,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    plan,
    before: {
      categoryCount: before.categoryCount,
      bookCount: before.bookCount,
      relationCount: before.relationCount,
      checksum: before.checksum,
    },
    after: {
      categoryCount: after.categoryCount,
      bookCount: after.bookCount,
      relationCount: after.relationCount,
      checksum: after.checksum,
    },
    changedRows: options.mode === "execute" ? changedEntries.length : 0,
    countsUnchanged:
      before.categoryCount === after.categoryCount &&
      before.bookCount === after.bookCount &&
      before.relationCount === after.relationCount,
  };
  const reportPath = await writeBackfillReport(report, options.mode);
  console.log("[REPORT] " + path.relative(process.cwd(), reportPath));
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error("[FAIL] " + message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[DATABASE_URL_REDACTED]"));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
