import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { assertSafeDatabase } from "@/lib/database-safety";
import {
  TAXONOMY_VERSION,
  mapLegacyInteractionEvent,
  validateCanonicalEventFields,
} from "@/lib/interaction-taxonomy";

interface AuditRow {
  id: string;
  userId: string;
  bookId: string;
  actionType: string;
  metadata: unknown;
  createdAt: Date;
}

function increment(counter: Record<string, number>, key: string): void {
  counter[key] = (counter[key] ?? 0) + 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function writeReport(report: Record<string, unknown>): Promise<{ json: string; markdown: string }> {
  const directory = path.resolve("outputs", "taxonomy");
  await mkdir(directory, { recursive: true });
  const stem = new Date().toISOString().replace(/[:.]/g, "-") + `-${process.pid}`;
  const jsonPath = path.join(directory, `${stem}-legacy-event-audit.json`);
  const markdownPath = path.join(directory, `${stem}-legacy-event-audit.md`);
  const rawCounts = report.rawCounts as Record<string, number>;
  const canonicalCounts = report.canonicalCounts as Record<string, number>;
  const table = (counts: Record<string, number>) =>
    Object.entries(counts)
      .map(([name, count]) => `| ${name} | ${count} |`)
      .join("\n");
  const markdown = [
    "# Legacy Interaction Audit",
    "",
    `- Taxonomy: \`${TAXONOMY_VERSION}\``,
    `- Database: \`${report.databaseName}\``,
    `- Total: ${report.total}`,
    `- Unknown: ${report.unknownCount}`,
    `- Duplicate rows theo user/book/type/timestamp: ${report.duplicateRows}`,
    "",
    "## Raw event",
    "",
    "| Event | Count |",
    "|---|---:|",
    table(rawCounts),
    "",
    "## Canonical event",
    "",
    "| Event | Count |",
    "|---|---:|",
    table(canonicalCounts),
    "",
  ].join("\n");
  await writeFile(jsonPath, JSON.stringify(report, null, 2) + "\n", { encoding: "utf-8", flag: "wx" });
  await writeFile(markdownPath, markdown, { encoding: "utf-8", flag: "wx" });
  return { json: jsonPath, markdown: markdownPath };
}

async function main(): Promise<void> {
  const target = assertSafeDatabase({
    operation: "read-only",
    databaseUrl: process.env.DATABASE_URL,
  });
  if (target.databaseName !== "bookverse_ai_test") {
    throw new Error("Legacy event audit chỉ được chạy trên bookverse_ai_test.");
  }

  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      return tx.interactionEvent.findMany({
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          userId: true,
          bookId: true,
          actionType: true,
          metadata: true,
          createdAt: true,
        },
      });
    });
    const rawCounts: Record<string, number> = {};
    const canonicalCounts: Record<string, number> = {};
    const unknownCounts: Record<string, number> = {};
    const missingRequired: Record<string, number> = {};
    const seen = new Set<string>();
    let duplicateRows = 0;
    let missingIdentityOrTimestamp = 0;
    let abnormalTimestamp = 0;
    let syntheticRows = 0;
    let instrumentedRows = 0;
    const now = Date.now();

    for (const row of rows as AuditRow[]) {
      const rawEvent = row.actionType.trim().toUpperCase();
      increment(rawCounts, rawEvent);
      const canonical = mapLegacyInteractionEvent(rawEvent);
      if (!canonical) {
        increment(unknownCounts, rawEvent);
      } else {
        increment(canonicalCounts, canonical);
        const metadata = isRecord(row.metadata) ? row.metadata : {};
        const missing = validateCanonicalEventFields(canonical, {
          userId: row.userId,
          bookId: row.bookId,
          timestamp: row.createdAt,
          ...metadata,
        });
        for (const field of missing.missingFields) increment(missingRequired, `${canonical}.${field}`);
      }

      if (!row.userId || !row.bookId || !row.createdAt) missingIdentityOrTimestamp += 1;
      if (row.createdAt.getUTCFullYear() < 2020 || row.createdAt.getTime() > now + 86_400_000) {
        abnormalTimestamp += 1;
      }
      const duplicateKey = [row.userId, row.bookId, rawEvent, row.createdAt.toISOString()].join("|");
      if (seen.has(duplicateKey)) duplicateRows += 1;
      else seen.add(duplicateKey);

      const metadata = isRecord(row.metadata) ? row.metadata : {};
      if (typeof metadata.originalEventType === "string") syntheticRows += 1;
      if (metadata.source === "next_app" || metadata.source === "recommendation_telemetry") {
        instrumentedRows += 1;
      }
    }

    const report = {
      status: Object.keys(unknownCounts).length === 0 ? "PASS" : "REVIEW_REQUIRED",
      generatedAt: new Date().toISOString(),
      databaseName: target.databaseName,
      taxonomyVersion: TAXONOMY_VERSION,
      total: rows.length,
      rawCounts: Object.fromEntries(Object.entries(rawCounts).sort()),
      canonicalCounts: Object.fromEntries(Object.entries(canonicalCounts).sort()),
      unknownCounts: Object.fromEntries(Object.entries(unknownCounts).sort()),
      unknownCount: Object.values(unknownCounts).reduce((sum, count) => sum + count, 0),
      missingRequired: Object.fromEntries(Object.entries(missingRequired).sort()),
      missingIdentityOrTimestamp,
      abnormalTimestamp,
      duplicateRows,
      syntheticRows,
      instrumentedRows,
      historyRewritten: false,
    };
    const outputs = await writeReport(report);
    console.log(JSON.stringify({ ...report, outputs }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Legacy event audit lỗi không xác định.";
  console.error("[FAIL] " + message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[DATABASE_URL_REDACTED]"));
  process.exitCode = 1;
});
