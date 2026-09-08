import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Prisma } from "@prisma/client";

import {
  validateParentAssignments,
  type CategoryCanonicalEntry,
  type CategoryNode,
} from "@/lib/category-hierarchy";
import {
  buildCategoryProfileFingerprint,
  detectCategoryProfile,
  loadCategoryProfiles,
  type CategoryIdentity,
} from "@/lib/category-profiles";
import { assertSafeDatabase, type SafeDatabaseTarget } from "@/lib/database-safety";
import prisma from "@/lib/prisma";

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

const CATEGORY_EXECUTE_DATABASES = new Set([
  "bookverse_ai_test",
  "bookverse_ai_category_legacy_test",
  "bookverse_ai_deploy_rehearsal",
  "bookverse_ai_full_deploy_rehearsal",
]);

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

function assertCategoryExecuteTarget(target: SafeDatabaseTarget): void {
  if (target.databaseName === "bookverse_ai") {
    throw new Error("Checkpoint A.1 cấm execute Category backfill trực tiếp trên bookverse_ai.");
  }
  if (!CATEGORY_EXECUTE_DATABASES.has(target.databaseName)) {
    throw new Error(
      `Category backfill execute chỉ cho phép database test/rehearsal đã duyệt, hiện tại: ${target.databaseName}.`,
    );
  }
}

async function getDatabaseSnapshot() {
  const [categories, bookRelations] = await Promise.all([
    prisma.category.findMany({
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
    prisma.book.findMany({
      orderBy: { id: "asc" },
      select: { id: true, categoryId: true },
    }),
  ]);
  const identities: CategoryIdentity[] = categories.map(({ id, name, slug }) => ({ id, name, slug }));
  return {
    categories,
    categoryCount: categories.length,
    bookCount: bookRelations.length,
    relationCount: bookRelations.length,
    identityChecksum: buildCategoryProfileFingerprint(identities),
    hierarchyChecksum: checksumSnapshot(
      categories.map(({ id, parentId, level, canonicalKey, canonicalName }) => ({
        id,
        parentId,
        level,
        canonicalKey,
        canonicalName,
      })),
    ),
    bookRelationChecksum: checksumSnapshot(bookRelations),
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

function buildPlan(
  categories: Awaited<ReturnType<typeof getDatabaseSnapshot>>["categories"],
  mappingEntries: CategoryCanonicalEntry[],
): { plan: BackfillPlan; changedEntries: CategoryCanonicalEntry[] } {
  const databaseIds = new Set(categories.map((category) => category.id));
  const mappingIds = new Set(mappingEntries.map((entry) => entry.categoryId));
  const nodes: CategoryNode[] = mappingEntries.map((entry) => ({
    id: entry.categoryId,
    name: entry.categoryName,
    parentId: entry.parentId,
    level: entry.level,
  }));
  const hierarchyValidation = validateParentAssignments(nodes);
  const categoriesNotFound = mappingEntries
    .filter((entry) => !databaseIds.has(entry.categoryId))
    .map((entry) => entry.categoryId);
  const mappingsNotFound = categories
    .filter((category) => !mappingIds.has(category.id))
    .map((category) => category.id);
  const missingParents = mappingEntries
    .filter((entry) => entry.parentId && !databaseIds.has(entry.parentId))
    .map((entry) => entry.categoryId);
  const currentById = new Map(categories.map((category) => [category.id, category]));
  let parentUpdates = 0;
  let levelUpdates = 0;
  let canonicalUpdates = 0;
  let unchanged = 0;
  const changedEntries: CategoryCanonicalEntry[] = [];

  for (const entry of mappingEntries) {
    const current = currentById.get(entry.categoryId);
    if (!current) continue;
    const parentChanged = current.parentId !== entry.parentId;
    const levelChanged = current.level !== entry.level;
    const canonicalChanged =
      current.canonicalKey !== entry.canonicalKey || current.canonicalName !== entry.canonicalName;
    parentUpdates += parentChanged ? 1 : 0;
    levelUpdates += levelChanged ? 1 : 0;
    canonicalUpdates += canonicalChanged ? 1 : 0;
    if (parentChanged || levelChanged || canonicalChanged) {
      changedEntries.push(entry);
    } else {
      unchanged += 1;
    }
  }

  return {
    plan: {
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
    },
    changedEntries,
  };
}

function hasCriticalPlanError(plan: BackfillPlan): boolean {
  return (
    plan.categoriesNotFound.length > 0 ||
    plan.mappingsNotFound.length > 0 ||
    plan.missingParents.length > 0 ||
    plan.cycleCount > 0 ||
    plan.selfParentCount > 0 ||
    plan.levelMismatchCount > 0
  );
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const startedAt = new Date();
  const databaseTarget = assertSafeDatabase({
    operation: options.mode === "execute" ? "destructive" : "read-only",
    databaseUrl: process.env.DATABASE_URL,
  });
  if (options.mode === "execute") assertCategoryExecuteTarget(databaseTarget);

  const profiles = await loadCategoryProfiles();
  const before = await getDatabaseSnapshot();
  const identities = before.categories.map(({ id, name, slug }) => ({ id, name, slug }));
  let detected;
  try {
    detected = detectCategoryProfile(identities, profiles);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không nhận diện được Category profile.";
    const failureReport = {
      status: "FAIL_CLOSED",
      mode: options.mode,
      databaseName: databaseTarget.databaseName,
      actualCategoryCount: before.categoryCount,
      actualFingerprint: before.identityChecksum,
      error: message,
      writesExecuted: false,
    };
    const reportPath = await writeBackfillReport(failureReport, options.mode + "-failed");
    console.log("[REPORT] " + path.relative(process.cwd(), reportPath));
    throw error;
  }

  const { plan, changedEntries } = buildPlan(before.categories, detected.canonicalEntries);
  console.log("[DATABASE] " + databaseTarget.maskedUrl);
  console.log(`[PROFILE] ${detected.profile.profileName}@${detected.profile.profileVersion}`);
  console.log("[FINGERPRINT] SHA-256 " + detected.fingerprint);
  console.log("[MAPPING] SHA-256 " + detected.profile.mappingChecksum);
  console.log("[PLAN] " + JSON.stringify(plan));

  if (hasCriticalPlanError(plan)) {
    throw new Error("Category backfill preflight failed; no database writes were executed.");
  }

  if (options.mode === "execute" && changedEntries.length > 0) {
    assertSafeDatabase({ operation: "destructive", databaseUrl: process.env.DATABASE_URL });
    assertCategoryExecuteTarget(databaseTarget);
    await prisma.$transaction(
      async (tx) => {
        // Nhận diện lại trong transaction để chặn thay đổi xảy ra giữa preflight và write.
        const transactionCategories = await tx.category.findMany({
          orderBy: { id: "asc" },
          select: { id: true, name: true, slug: true },
        });
        const transactionDetection = detectCategoryProfile(transactionCategories, profiles);
        if (
          transactionDetection.profile.profileName !== detected.profile.profileName ||
          transactionDetection.fingerprint !== detected.fingerprint
        ) {
          throw new Error("Category profile thay đổi trước transaction; rollback toàn bộ.");
        }

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
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10_000,
        timeout: 120_000,
      },
    );
  }

  const after = await getDatabaseSnapshot();
  if (
    before.categoryCount !== after.categoryCount ||
    before.bookCount !== after.bookCount ||
    before.relationCount !== after.relationCount ||
    before.identityChecksum !== after.identityChecksum ||
    before.bookRelationChecksum !== after.bookRelationChecksum
  ) {
    throw new Error(
      "Backfill invariant failed: count, Category identity hoặc Book–Category relationship đã thay đổi.",
    );
  }
  if (options.mode === "dry-run" && before.hierarchyChecksum !== after.hierarchyChecksum) {
    throw new Error("Dry-run safety assertion failed: Category hierarchy rows changed.");
  }

  const afterNodes: CategoryNode[] = after.categories.map((category) => ({
    id: category.id,
    name: category.name,
    parentId: category.parentId,
    level: category.level,
  }));
  const afterHierarchy = validateParentAssignments(afterNodes);
  const mappedCount = after.categories.filter(
    (category) => category.canonicalKey && category.canonicalName,
  ).length;
  const finishedAt = new Date();
  const report = {
    status: "PASS",
    mode: options.mode,
    databaseName: databaseTarget.databaseName,
    profile: {
      name: detected.profile.profileName,
      version: detected.profile.profileVersion,
      expectedCategoryCount: detected.profile.expectedCategoryCount,
      sourceFingerprint: detected.profile.sourceFingerprint,
      mappingFile: path.relative(process.cwd(), detected.profile.mappingPath).replace(/\\/g, "/"),
      mappingChecksum: detected.profile.mappingChecksum,
      sourceChecksum: detected.profile.sourceChecksum,
    },
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    plan,
    before: {
      categoryCount: before.categoryCount,
      bookCount: before.bookCount,
      relationCount: before.relationCount,
      identityChecksum: before.identityChecksum,
      hierarchyChecksum: before.hierarchyChecksum,
      bookRelationChecksum: before.bookRelationChecksum,
    },
    after: {
      categoryCount: after.categoryCount,
      bookCount: after.bookCount,
      relationCount: after.relationCount,
      identityChecksum: after.identityChecksum,
      hierarchyChecksum: after.hierarchyChecksum,
      bookRelationChecksum: after.bookRelationChecksum,
      mappedCount,
      rootCount: after.categories.filter((category) => category.parentId === null).length,
      childCount: after.categories.filter((category) => category.parentId !== null).length,
      orphanCount: afterHierarchy.orphans.length,
      cycleCount: afterHierarchy.cycles.length,
      selfParentCount: afterHierarchy.selfParents.length,
    },
    changedRows: options.mode === "execute" ? changedEntries.length : 0,
    countsAndRelationshipsUnchanged: true,
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
