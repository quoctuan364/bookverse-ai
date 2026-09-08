import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertSafeDatabase } from "@/lib/database-safety";
import {
  assessRecommendationDataReadiness,
  pseudonymizeForExport,
} from "@/lib/recommendation-data-readiness";
import prisma from "@/lib/prisma";

function requiredArgument(name: string): string {
  const value = process.argv
    .find((argument) => argument.startsWith(`--${name}=`))
    ?.split("=", 2)[1]
    ?.trim();
  if (!value) throw new Error(`Thiếu --${name}=...`);
  return value;
}

async function main(): Promise<void> {
  const target = assertSafeDatabase({
    operation: "read-only",
    databaseUrl: process.env.DATABASE_URL,
  });
  const pilotId = requiredArgument("pilot-id");
  const hmacKey = process.env.BOOKVERSE_EXPORT_HMAC_KEY ?? "";
  // Kiểm tra key trước cả khi dataset rỗng để export không có chế độ yếu hơn.
  pseudonymizeForExport("key-check", hmacKey, "check");

  const requests = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    return tx.recommendationRequest.findMany({
      where: {
        collectionContext: "PILOT_CONSENTED",
        pilotId,
        consentVersion: { not: null },
      },
      orderBy: [{ generatedAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        userId: true,
        algorithmVersion: true,
        taxonomyVersion: true,
        surface: true,
        pilotId: true,
        consentVersion: true,
        experimentGroup: true,
        generatedAt: true,
        items: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            bookId: true,
            position: true,
            sourceComponent: true,
          },
        },
        events: {
          orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            requestItemId: true,
            type: true,
            canonicalEvent: true,
            sourceType: true,
            sourceId: true,
            attributionAnchor: true,
            deviceClass: true,
            occurredAt: true,
          },
        },
      },
    });
  });

  const userEventCounts = new Map<string, number>();
  const userIds = new Set<string>();
  const bookIds = new Set<string>();
  let impressions = 0;
  let clicks = 0;
  let conversions = 0;
  const timestamps: number[] = [];
  for (const request of requests) {
    userIds.add(request.userId);
    for (const item of request.items) bookIds.add(item.bookId);
    for (const event of request.events) {
      userEventCounts.set(
        request.userId,
        (userEventCounts.get(request.userId) ?? 0) + 1,
      );
      timestamps.push(event.occurredAt.getTime());
      if (event.type === "IMPRESSION") impressions += 1;
      if (event.type === "CLICK") clicks += 1;
      if (event.type === "CONVERSION") conversions += 1;
    }
  }
  const counts = [...userEventCounts.values()];
  const collectionDays =
    timestamps.length > 0
      ? Math.max(
          1,
          Math.ceil(
            (Math.max(...timestamps) - Math.min(...timestamps)) /
              (24 * 60 * 60 * 1_000),
          ),
        )
      : 0;
  const readinessCounts = {
    consentedUsers: userIds.size,
    exposedBooks: bookIds.size,
    verifiedEvents: impressions + clicks + conversions,
    impressions,
    clicks,
    conversions,
    usersWithThreeEvents: counts.filter((count) => count >= 3).length,
    usersWithFiveEvents: counts.filter((count) => count >= 5).length,
    usersWithTenEvents: counts.filter((count) => count >= 10).length,
    collectionDays,
  };
  const readiness = assessRecommendationDataReadiness(readinessCounts);
  const anonymized = requests.map((request) => ({
    requestId: pseudonymizeForExport(request.id, hmacKey, "request"),
    userId: pseudonymizeForExport(request.userId, hmacKey, "user"),
    algorithmVersion: request.algorithmVersion,
    taxonomyVersion: request.taxonomyVersion,
    surface: request.surface,
    pilotId: request.pilotId,
    consentVersion: request.consentVersion,
    experimentGroup: request.experimentGroup,
    generatedAt: request.generatedAt.toISOString(),
    items: request.items.map((item) => ({
      requestItemId: pseudonymizeForExport(
        item.id,
        hmacKey,
        "request-item",
      ),
      bookId: pseudonymizeForExport(item.bookId, hmacKey, "book"),
      position: item.position,
      sourceComponent: item.sourceComponent,
    })),
    events: request.events.map((event) => ({
      eventId: pseudonymizeForExport(event.id, hmacKey, "event"),
      requestItemId: pseudonymizeForExport(
        event.requestItemId,
        hmacKey,
        "request-item",
      ),
      type: event.type,
      canonicalEvent: event.canonicalEvent,
      sourceType: event.sourceType,
      sourceId: event.sourceId
        ? pseudonymizeForExport(event.sourceId, hmacKey, "source")
        : null,
      attributionAnchor: event.attributionAnchor,
      deviceClass: event.deviceClass,
      occurredAt: event.occurredAt.toISOString(),
    })),
  }));
  const deterministic = {
    schemaVersion: "bookverse-pilot-export-v1",
    databaseProfile: target.databaseName,
    pilotId,
    provenance: "PILOT_CONSENTED_ONLY",
    containsRawUserIdentity: false,
    readinessCounts,
    readiness,
    requests: anonymized,
  };
  const canonical = JSON.stringify(deterministic);
  const datasetSha256 = crypto
    .createHash("sha256")
    .update(canonical)
    .digest("hex");
  const output = {
    ...deterministic,
    datasetSha256,
    exportedAt: new Date().toISOString(),
  };
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const directory = path.resolve("outputs", "pilot-export", runId);
  await mkdir(directory, { recursive: true });
  const outputPath = path.join(directory, "pilot-interactions.anonymized.json");
  await writeFile(outputPath, JSON.stringify(output, null, 2) + "\n", {
    encoding: "utf8",
    flag: "wx",
  });
  console.log(
    JSON.stringify(
      {
        decision: readiness.decision,
        datasetSha256,
        requests: anonymized.length,
        path: path.relative(process.cwd(), outputPath),
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
}

main().catch(async (error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Export pilot thất bại.";
  console.error(
    message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[DATABASE_URL_REDACTED]"),
  );
  await prisma.$disconnect().catch(() => undefined);
  process.exitCode = 1;
});
