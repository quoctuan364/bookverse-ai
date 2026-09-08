import fs from "node:fs";
import path from "node:path";

import { isVerifiedRealUserProvenance } from "@/lib/recommendation-evidence-policy";
import prisma from "@/lib/prisma";

function assertTestDatabase(databaseUrl: string): void {
  const databaseName = new URL(databaseUrl).pathname.replace(/^\//u, "").split("/")[0];
  if (databaseName !== "bookverse_ai_test") throw new Error(`EVIDENCE_AUDIT_DATABASE_GUARD:${databaseName || "EMPTY"}`);
}

function getProvenance(metadata: unknown): unknown {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
  return (metadata as { provenance?: unknown }).provenance;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL_REQUIRED");
  assertTestDatabase(databaseUrl);
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    const rows = await tx.recommendationEvidence.findMany({
      select: {
        id: true,
        label: true,
        metadata: true,
        recommendation: { select: { userId: true } },
        dailyRecommendation: { select: { userId: true } },
      },
    });
    const counts = {
      total: rows.length,
      verifiedRealUser: 0,
      synthetic: 0,
      missingProvenance: 0,
      invalidOwner: 0,
    };
    const samples: Array<{ id: string; label: string; status: string }> = [];
    for (const row of rows) {
      const metadata = row.metadata;
      const provenance = getProvenance(metadata);
      const ownerUserId = row.recommendation?.userId ?? row.dailyRecommendation?.userId ?? undefined;
      const dataLabel = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? (metadata as { dataLabel?: unknown }).dataLabel : undefined;
      if (dataLabel === "SYNTHETIC_DATA") {
        counts.synthetic += 1;
        if (samples.length < 10) samples.push({ id: row.id, label: row.label, status: "SYNTHETIC_DATA" });
      } else if (isVerifiedRealUserProvenance(provenance, ownerUserId)) {
        counts.verifiedRealUser += 1;
      } else if (provenance && typeof provenance === "object" && "userId" in provenance && (provenance as { userId?: unknown }).userId !== ownerUserId) {
        counts.invalidOwner += 1;
        if (samples.length < 10) samples.push({ id: row.id, label: row.label, status: "INVALID_OWNER" });
      } else {
        counts.missingProvenance += 1;
        if (samples.length < 10) samples.push({ id: row.id, label: row.label, status: "MISSING_PROVENANCE" });
      }
    }
    return { counts, samples, transactionReadOnly: true };
  });
  const report = {
    status: result.counts.total === result.counts.missingProvenance + result.counts.synthetic + result.counts.verifiedRealUser + result.counts.invalidOwner ? "PARTIAL" : "FAILED",
    checkedAt: new Date().toISOString(),
    database: "bookverse_ai_test",
    dataLabel: "SYNTHETIC_DATA/TEST_FIXTURE_OR_NOT_VERIFIED",
    ...result,
  };
  const outputDirectory = path.join(process.cwd(), "outputs", "g2-2-recommendation-evidence");
  fs.mkdirSync(outputDirectory, { recursive: true });
  const outputPath = path.join(outputDirectory, `provenance-audit-${report.checkedAt.replace(/[:.]/gu, "-")}.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  console.log(JSON.stringify({ ...report, outputPath }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
