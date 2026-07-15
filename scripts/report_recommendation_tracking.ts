import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertSafeDatabase } from "@/lib/database-safety";
import prisma from "@/lib/prisma";

function parseSinceHours(): number {
  const raw = process.argv.find((argument) => argument.startsWith("--since-hours="))?.split("=")[1];
  if (!raw) return 24;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || value > 24 * 365) {
    throw new Error("--since-hours phải nằm trong khoảng (0, 8760].");
  }
  return value;
}

async function readResponseSnapshot(): Promise<Record<string, unknown> | null> {
  const rawPath = process.argv.find((argument) => argument.startsWith("--responses="))?.split("=")[1];
  if (!rawPath) return null;
  const content = await readFile(path.resolve(rawPath), "utf-8");
  return JSON.parse(content) as Record<string, unknown>;
}

async function main(): Promise<void> {
  const target = assertSafeDatabase({
    operation: "read-only",
    databaseUrl: process.env.DATABASE_URL,
  });
  const sinceHours = parseSinceHours();
  const responseSnapshot = await readResponseSnapshot();
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1_000);
  const requests = await prisma.recommendationRequest.findMany({
    where: { generatedAt: { gte: since } },
    select: {
      id: true,
      surface: true,
      items: {
        orderBy: { position: "asc" },
        select: { bookId: true, position: true },
      },
      events: { select: { deduplicationKey: true } },
    },
  });

  let invalidPositionRequestCount = 0;
  let duplicateBookRequestCount = 0;
  for (const request of requests) {
    const expectedPositions = request.items.map((_, index) => index + 1);
    if (JSON.stringify(request.items.map((item) => item.position)) !== JSON.stringify(expectedPositions)) {
      invalidPositionRequestCount += 1;
    }
    if (new Set(request.items.map((item) => item.bookId)).size !== request.items.length) {
      duplicateBookRequestCount += 1;
    }
  }

  const [orphanRequests, orphanItems, orphanEvents, mismatchedEvents] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string }>>`
      SELECT request.id
      FROM recommendation_requests request
      LEFT JOIN recommendation_request_items item ON item."requestId" = request.id
      GROUP BY request.id
      HAVING COUNT(item.id) = 0
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM recommendation_request_items item
      LEFT JOIN recommendation_requests request ON request.id = item."requestId"
      WHERE request.id IS NULL
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM recommendation_telemetry_events event
      LEFT JOIN recommendation_requests request ON request.id = event."requestId"
      LEFT JOIN recommendation_request_items item ON item.id = event."requestItemId"
      WHERE request.id IS NULL OR item.id IS NULL
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM recommendation_telemetry_events event
      JOIN recommendation_request_items item ON item.id = event."requestItemId"
      WHERE event."requestId" <> item."requestId"
    `,
  ]);
  const eventCount = requests.reduce((sum, request) => sum + request.events.length, 0);
  const uniqueEventKeys = new Set(
    requests.flatMap((request) => request.events.map((event) => event.deduplicationKey)),
  ).size;
  const report = {
    status: "PASS",
    mode: "READ_ONLY",
    databaseName: target.databaseName,
    since: since.toISOString(),
    sinceHours,
    databaseRequestCount: requests.length,
    itemCount: requests.reduce((sum, request) => sum + request.items.length, 0),
    eventCount,
    uniqueEventKeys,
    telemetryDuplicateRate: eventCount === 0 ? 0 : (eventCount - uniqueEventKeys) / eventCount,
    invalidPositionRequestCount,
    duplicateBookRequestCount,
    orphanRequestCount: orphanRequests.length,
    orphanItemCount: Number(orphanItems[0]?.count ?? BigInt(0)),
    orphanEventCount: Number(orphanEvents[0]?.count ?? BigInt(0)),
    mismatchedEventCount: Number(mismatchedEvents[0]?.count ?? BigInt(0)),
    recommendationResponses:
      typeof responseSnapshot?.requestCount === "number" ? responseSnapshot.requestCount : "NOT_AVAILABLE",
    tracked:
      typeof responseSnapshot?.trackedCount === "number" ? responseSnapshot.trackedCount : "NOT_AVAILABLE",
    degraded:
      typeof responseSnapshot?.degradedCount === "number" ? responseSnapshot.degradedCount : "NOT_AVAILABLE",
    requestIdNullRate:
      typeof responseSnapshot?.requestIdNullCount === "number" &&
      typeof responseSnapshot?.requestCount === "number" &&
      responseSnapshot.requestCount > 0
        ? responseSnapshot.requestIdNullCount / responseSnapshot.requestCount
        : "NOT_AVAILABLE",
    duplicateBooksNormalized: responseSnapshot?.duplicateBooksNormalized ?? "NOT_AVAILABLE",
    duplicateRanksNormalized: responseSnapshot?.duplicateRanksNormalized ?? "NOT_AVAILABLE",
    itemCountMismatch: responseSnapshot?.responseDatabaseMismatch ?? "NOT_AVAILABLE",
    responseDatabaseMismatch: responseSnapshot?.responseDatabaseMismatch ?? "NOT_AVAILABLE",
    recommendation5xxCount: responseSnapshot?.recommendation5xxCount ?? "NOT_AVAILABLE",
    telemetry4xxCount: responseSnapshot?.telemetry4xxCount ?? "NOT_AVAILABLE",
    telemetry5xxCount: responseSnapshot?.telemetry5xxCount ?? "NOT_AVAILABLE",
    observedTelemetryDuplicateRate: responseSnapshot?.telemetryDuplicateRate ?? "NOT_AVAILABLE",
    surfaceCounts: Object.fromEntries(
      [...new Set(requests.map((request) => request.surface))].map((surface) => [
        surface,
        requests.filter((request) => request.surface === surface).length,
      ]),
    ),
  };

  const directory = path.resolve("outputs", "telemetry");
  await mkdir(directory, { recursive: true });
  const filePath = path.join(
    directory,
    `${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}-observability.json`,
  );
  await writeFile(filePath, JSON.stringify(report, null, 2) + "\n", {
    encoding: "utf-8",
    flag: "wx",
  });
  console.log("[PASS] Recommendation tracking observability read-only");
  console.log("[REPORT] " + path.relative(process.cwd(), filePath));
  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
}

main().catch(async (error: unknown) => {
  const message = error instanceof Error ? error.message : "Report telemetry lỗi không xác định.";
  console.error("[FAIL] " + message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[DATABASE_URL_REDACTED]"));
  await prisma.$disconnect().catch(() => undefined);
  process.exitCode = 1;
});
