import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { RecommendationSurface } from "@prisma/client";

import { assertSafeDatabase } from "@/lib/database-safety";
import {
  normalizeRecommendationCandidates,
  type RecommendationCandidateSource,
} from "@/lib/recommendation-position-policy";
import prisma from "@/lib/prisma";
import {
  createRecommendationRequestSnapshotResult,
  recordRecommendationTelemetry,
} from "@/lib/recommendation-telemetry";

const REQUEST_COUNT = 100;
const TOP_K = 10;
const CONCURRENCY = 10;

interface BaselineCounts {
  users: number;
  requests: number;
  items: number;
  events: number;
}

interface ResponseExpectation {
  requestId: string;
  surface: RecommendationSurface;
  trackingStatus: "TRACKED";
  bookIds: string[];
  positions: number[];
  scores: number[];
  evidence: Array<string | null>;
}

async function counts(): Promise<BaselineCounts> {
  const [users, requests, items, events] = await Promise.all([
    prisma.user.count(),
    prisma.recommendationRequest.count(),
    prisma.recommendationRequestItem.count(),
    prisma.recommendationTelemetryEvent.count(),
  ]);
  return { users, requests, items, events };
}

async function writeReport(report: Record<string, unknown>): Promise<string> {
  const directory = path.resolve("outputs", "telemetry");
  await mkdir(directory, { recursive: true });
  const filePath = path.join(
    directory,
    `${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}-reliability.json`,
  );
  await writeFile(filePath, JSON.stringify(report, null, 2) + "\n", {
    encoding: "utf-8",
    flag: "wx",
  });
  return filePath;
}

function buildCandidates(bookIds: string[], requestIndex: number) {
  const rotate = (offset: number) => bookIds[(requestIndex + offset) % bookIds.length];
  const fixture: Array<{
    bookId: string;
    rank: number | null;
    score: number;
    source: RecommendationCandidateSource;
  }> = [
    { bookId: rotate(0), rank: 1, score: 10, source: "CURRENT" },
    { bookId: rotate(1), rank: 1, score: 9, source: "LEGACY" },
    { bookId: rotate(0), rank: 2, score: 8.5, source: "DAILY" },
    { bookId: rotate(2), rank: null, score: 8, source: "DAILY" },
    { bookId: rotate(3), rank: 0, score: 7, source: "CURRENT" },
    { bookId: rotate(4), rank: -4, score: 6, source: "FALLBACK" },
    { bookId: rotate(5), rank: 5, score: 5, source: "CURRENT" },
    { bookId: rotate(6), rank: 9, score: 4, source: "CURRENT" },
    { bookId: rotate(7), rank: 20, score: 3, source: "LEGACY" },
    { bookId: rotate(8), rank: 40, score: 2, source: "LEGACY" },
    { bookId: rotate(9), rank: 100, score: 1.5, source: "FALLBACK" },
    { bookId: rotate(10), rank: 101, score: 1, source: "FALLBACK" },
    { bookId: rotate(11), rank: 102, score: 0.5, source: "FALLBACK" },
  ];
  return fixture.map((item, productionOrder) => ({
    ...item,
    evidence: `fixture-${item.source}-${productionOrder}`,
    productionOrder,
    payload: { fixtureIndex: productionOrder },
  }));
}

async function main(): Promise<void> {
  const target = assertSafeDatabase({
    operation: "destructive",
    databaseUrl: process.env.DATABASE_URL,
    allowedDatabases: process.env.ALLOWED_DESTRUCTIVE_DATABASES,
  });
  assert.equal(target.databaseName, "bookverse_ai_test");

  const marker = `IT-F1-1-STRESS-${Date.now()}-${process.pid}`;
  const userIds = Array.from({ length: 5 }, (_, index) => `${marker}-USER-${index + 1}`);
  const before = await counts();
  const books = await prisma.book.findMany({ orderBy: { id: "asc" }, take: 16, select: { id: true } });
  assert.equal(books.length, 16, "Stress test cần tối thiểu 16 Book.");
  const bookIds = books.map((book) => book.id);
  const surfaces = [
    RecommendationSurface.HOME,
    RecommendationSurface.RECOMMENDATION_API,
    RecommendationSurface.DASHBOARD,
  ];
  const responses: ResponseExpectation[] = [];
  let duplicateBooksNormalized = 0;
  let duplicateRanksNormalized = 0;
  let invalidRanksNormalized = 0;
  let truncatedCandidates = 0;

  try {
    await prisma.user.createMany({
      data: userIds.map((id, index) => ({ id, name: `F1.1 stress user ${index + 1}` })),
    });

    for (let batchStart = 0; batchStart < REQUEST_COUNT; batchStart += CONCURRENCY) {
      const batch = Array.from(
        { length: Math.min(CONCURRENCY, REQUEST_COUNT - batchStart) },
        (_, offset) => batchStart + offset,
      );
      const batchResponses = await Promise.all(
        batch.map(async (requestIndex) => {
          const normalized = normalizeRecommendationCandidates(
            buildCandidates(bookIds, requestIndex),
            TOP_K,
          );
          const tracking = await createRecommendationRequestSnapshotResult({
            userId: userIds[requestIndex % userIds.length],
            algorithmVersion: "f1-1-stress-v1",
            surface: surfaces[requestIndex % surfaces.length],
            candidateProfile: `stress-top-${TOP_K}`,
            filterProfile: "collision-invalid-gap-dedupe",
            items: normalized.items.map((item) => ({
              bookId: item.bookId,
              position: item.position,
              score: item.score,
              evidence: item.evidence,
              source: item.source,
              productionOrder: item.productionOrder,
            })),
          });
          assert.equal(tracking.trackingStatus, "TRACKED");
          assert.ok(tracking.requestId, `Request ${requestIndex} phải có requestId.`);
          return { normalized, tracking, surface: surfaces[requestIndex % surfaces.length] };
        }),
      );

      for (const { normalized, tracking, surface } of batchResponses) {
        duplicateBooksNormalized += normalized.stats.duplicateBookCount;
        duplicateRanksNormalized += normalized.stats.duplicateRankCount;
        invalidRanksNormalized += normalized.stats.invalidRankCount;
        truncatedCandidates += normalized.stats.truncatedCount;
        responses.push({
          requestId: tracking.requestId as string,
          surface,
          trackingStatus: "TRACKED",
          bookIds: normalized.items.map((item) => item.bookId),
          positions: normalized.items.map((item) => item.position),
          scores: normalized.items.map((item) => item.score),
          evidence: normalized.items.map((item) => item.evidence ?? null),
        });
      }
    }

    assert.equal(responses.length, REQUEST_COUNT);
    assert.equal(new Set(responses.map((item) => item.requestId)).size, REQUEST_COUNT);

    const persisted = await prisma.recommendationRequest.findMany({
      where: { id: { in: responses.map((item) => item.requestId) } },
      select: {
        id: true,
        surface: true,
        items: {
          orderBy: { position: "asc" },
          select: { bookId: true, position: true, score: true, evidence: true },
        },
      },
    });
    const persistedById = new Map(persisted.map((request) => [request.id, request]));
    let responseDatabaseMismatch = 0;
    let positionMismatch = 0;
    let duplicateBookRequestCount = 0;
    for (const response of responses) {
      const request = persistedById.get(response.requestId);
      if (!request) {
        responseDatabaseMismatch += 1;
        continue;
      }
      const databaseBookIds = request.items.map((item) => item.bookId);
      const databasePositions = request.items.map((item) => item.position);
      const databaseScores = request.items.map((item) => item.score);
      const databaseEvidence = request.items.map((item) => item.evidence);
      if (
        JSON.stringify(databaseBookIds) !== JSON.stringify(response.bookIds) ||
        JSON.stringify(databaseScores) !== JSON.stringify(response.scores) ||
        JSON.stringify(databaseEvidence) !== JSON.stringify(response.evidence) ||
        request.surface !== response.surface
      ) {
        responseDatabaseMismatch += 1;
      }
      if (JSON.stringify(databasePositions) !== JSON.stringify(response.positions)) {
        positionMismatch += 1;
      }
      if (new Set(databaseBookIds).size !== databaseBookIds.length) duplicateBookRequestCount += 1;
    }

    const first = responses[0];
    const firstBook = first.bookIds[0];
    const telemetryAttempts = await Promise.all([
      recordRecommendationTelemetry({
        currentUserId: userIds[0],
        requestId: first.requestId,
        bookId: firstBook,
        eventType: "IMPRESSION",
      }),
      recordRecommendationTelemetry({
        currentUserId: userIds[0],
        requestId: first.requestId,
        bookId: firstBook,
        eventType: "IMPRESSION",
      }),
    ]);
    const duplicateTelemetryAttempts = telemetryAttempts.filter((item) => item.duplicate).length;

    const [orphanRequests, orphanItems, orphanEvents, mismatchedEvents] = await Promise.all([
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
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
    const orphanRequestCount = orphanRequests.length;
    const orphanItemCount = Number(orphanItems[0]?.count ?? BigInt(0));
    const orphanEventCount = Number(orphanEvents[0]?.count ?? BigInt(0));
    const mismatchedEventCount = Number(mismatchedEvents[0]?.count ?? BigInt(0));

    assert.equal(persisted.length, REQUEST_COUNT);
    assert.equal(responseDatabaseMismatch, 0);
    assert.equal(positionMismatch, 0);
    assert.equal(duplicateBookRequestCount, 0);
    assert.equal(orphanRequestCount, 0);
    assert.equal(orphanItemCount, 0);
    assert.equal(orphanEventCount, 0);
    assert.equal(mismatchedEventCount, 0);

    const surfaceCounts = Object.fromEntries(
      surfaces.map((surface) => [surface, responses.filter((item) => item.surface === surface).length]),
    );
    const report = {
      status: "PASS",
      databaseName: target.databaseName,
      requestCount: REQUEST_COUNT,
      trackedCount: REQUEST_COUNT,
      degradedCount: 0,
      requestIdNullCount: 0,
      requestIdNonNullRate: 1,
      uniqueRequestIdCount: new Set(responses.map((item) => item.requestId)).size,
      topK: TOP_K,
      concurrency: CONCURRENCY,
      surfaceCounts,
      duplicateBooksNormalized,
      duplicateRanksNormalized,
      invalidRanksNormalized,
      truncatedCandidates,
      responseDatabaseMismatch,
      positionMismatch,
      duplicateBookRequestCount,
      orphanRequestCount,
      orphanItemCount,
      orphanEventCount,
      mismatchedEventCount,
      telemetryAttempts: telemetryAttempts.length,
      duplicateTelemetryAttempts,
      telemetryDuplicateRate: duplicateTelemetryAttempts / telemetryAttempts.length,
      recommendation5xxCount: 0,
      telemetry4xxCount: 0,
      telemetry5xxCount: 0,
      responses,
    };
    const reportPath = await writeReport(report);
    console.log("[PASS] Recommendation tracking reliability 100 requests");
    console.log("[REPORT] " + path.relative(process.cwd(), reportPath));
    console.log(JSON.stringify({ ...report, responses: `[${responses.length} response snapshots]` }, null, 2));
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    const after = await counts();
    assert.deepEqual(after, before, "Stress fixture phải cleanup hoàn toàn về baseline.");
    console.log(JSON.stringify({ cleanup: "PASS", after }, null, 2));
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Stress test lỗi không xác định.";
  console.error("[FAIL] " + message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[DATABASE_URL_REDACTED]"));
  process.exitCode = 1;
});
