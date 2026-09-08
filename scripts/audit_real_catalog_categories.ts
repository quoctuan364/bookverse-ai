import fs from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { assertSafeDatabase } from "@/lib/database-safety";
import { resolveCategoryTargets } from "@/lib/real-catalog-import";
import { loadAndValidateCategoryMapping, loadAndValidateRealCatalog } from "@/lib/real-catalog";

const root = process.cwd();
const sourcePath = path.join(root, "data", "real-catalog", "bookverse_real_catalog.json");
const mappingPath = path.join(root, "config", "real-catalog-category-mapping.json");
const outputDirectory = path.join(root, "outputs", "real-catalog-category-audit");

function runId(): string {
  return new Date().toISOString().replace(/[:.]/gu, "-");
}

function csv(value: unknown): string {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.REAL_CATALOG_DATABASE_URL ?? process.env.DATABASE_URL;
  const target = assertSafeDatabase({ operation: "read-only", databaseUrl });
  if (target.databaseName !== "bookverse_ai_test") {
    throw new Error(`BLOCKED_DATABASE: audit category G2.1 chỉ được đọc bookverse_ai_test, nhận ${target.databaseName}.`);
  }

  const catalogResult = loadAndValidateRealCatalog(sourcePath);
  if (!catalogResult.catalog) throw new Error("FAILED_CATALOG_VALIDATION");
  const mappingResult = loadAndValidateCategoryMapping(
    mappingPath,
    catalogResult.catalog,
    catalogResult.summary.catalogChecksum,
  );
  if (!mappingResult.mapping) throw new Error("FAILED_MAPPING_VALIDATION");

  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    const categories = await prisma.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      return transaction.category.findMany({
        select: { id: true, name: true, slug: true, canonicalKey: true, canonicalName: true, parentId: true },
      });
    });
    const resolution = resolveCategoryTargets(mappingResult.mapping, categories);
    if (resolution.errors.length > 0 || resolution.rows.length !== 39) {
      throw new Error(`FAILED_CATEGORY_RESOLUTION: ${resolution.errors.join(" | ")}`);
    }
    const countBySource = new Map<string, number>();
    for (const relation of catalogResult.catalog.bookCategories) {
      countBySource.set(relation.categoryId, (countBySource.get(relation.categoryId) ?? 0) + 1);
    }
    const resolvedBySource = new Map(resolution.rows.map((row) => [row.sourceId, row]));
    const rows = mappingResult.mapping.entries.map((entry) => {
      const resolved = resolvedBySource.get(entry.sourceId);
      if (!resolved) throw new Error(`ORPHAN_MAPPING:${entry.sourceId}`);
      return {
        sourceCategory: `${entry.sourceId}/${entry.sourceSlug}`,
        sourceBookCount: countBySource.get(entry.sourceId) ?? 0,
        targetCategory: `${resolved.targetCategoryId}/${resolved.targetCategoryName}`,
        targetCanonicalKey: resolved.targetCanonicalKey,
        targetExistsInTestDatabase: true,
        confidence: resolved.confidence,
        rationale: resolved.rationale,
        ambiguity: resolved.ambiguity,
        resolutionMode: resolved.resolutionMode,
        finalStatus: resolved.confidence === "HIGH" ? "VERIFIED" : "PARTIAL",
      };
    });
    if (new Set(rows.map((row) => row.sourceCategory)).size !== 39) throw new Error("DUPLICATE_SOURCE_MAPPING");

    const report = {
      status: rows.every((row) => row.finalStatus === "VERIFIED") ? "VERIFIED" : "PARTIAL",
      checkedAt: new Date().toISOString(),
      database: target.databaseName,
      transactionReadOnly: true,
      sourceCatalogChecksum: catalogResult.summary.catalogChecksum,
      mappingChecksum: mappingResult.mappingChecksum,
      summary: {
        entries: rows.length,
        high: rows.filter((row) => row.confidence === "HIGH").length,
        medium: rows.filter((row) => row.confidence === "MEDIUM").length,
        low: rows.filter((row) => row.confidence === "LOW").length,
        primary: rows.filter((row) => row.resolutionMode === "PRIMARY").length,
        fallback: rows.filter((row) => row.resolutionMode === "FALLBACK").length,
        orphan: 0,
      },
      rows,
    };
    fs.mkdirSync(outputDirectory, { recursive: true });
    const id = runId();
    const jsonPath = path.join(outputDirectory, `category-audit-${id}.json`);
    const csvPath = path.join(outputDirectory, `category-audit-${id}.csv`);
    const markdownPath = path.join(outputDirectory, `category-audit-${id}.md`);
    fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    const headers = Object.keys(rows[0]);
    fs.writeFileSync(
      csvPath,
      `${[headers.map(csv).join(","), ...rows.map((row) => headers.map((key) => csv(row[key as keyof typeof row])).join(","))].join("\n")}\n`,
      { encoding: "utf8", flag: "wx" },
    );
    const markdownRows = rows.map(
      (row) =>
        `| ${row.sourceCategory} | ${row.sourceBookCount} | ${row.targetCategory} | ${row.targetCanonicalKey} | ${row.confidence} | ${row.resolutionMode} | ${row.finalStatus} | ${row.rationale} | ${row.ambiguity} |`,
    );
    fs.writeFileSync(
      markdownPath,
      `# Audit category G2.1\n\nTrạng thái: **${report.status}**. Database: \`${target.databaseName}\` (read-only). Mapping checksum: \`${mappingResult.mappingChecksum}\`.\n\n| Source | Count | Target | Canonical | Confidence | Mode | Status | Rationale | Ambiguity |\n|---|---:|---|---|---|---|---|---|---|\n${markdownRows.join("\n")}\n`,
      { encoding: "utf8", flag: "wx" },
    );
    console.log(JSON.stringify({ ...report.summary, status: report.status, mappingChecksum: mappingResult.mappingChecksum, jsonPath, csvPath, markdownPath }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
