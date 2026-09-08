import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  OrderStatus,
  RecommendationCollectionContext,
  RecommendationDeviceClass,
  RecommendationSurface,
  RecommendationTelemetryType,
} from "@prisma/client";

import { assertSafeDatabase } from "@/lib/database-safety";
import prisma from "@/lib/prisma";
import {
  RecommendationTelemetryError,
  createRecommendationRequestSnapshot,
  createRecommendationRequestSnapshotResult,
  recordRecommendationTelemetry,
  syncRecommendationConversionsForUser,
} from "@/lib/recommendation-telemetry";

interface Counts {
  users: number;
  requests: number;
  items: number;
  events: number;
  bookmarks: number;
  orders: number;
  orderItems: number;
}

async function counts(): Promise<Counts> {
  const [users, requests, items, events, bookmarks, orders, orderItems] = await Promise.all([
    prisma.user.count(),
    prisma.recommendationRequest.count(),
    prisma.recommendationRequestItem.count(),
    prisma.recommendationTelemetryEvent.count(),
    prisma.bookmark.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
  ]);
  return { users, requests, items, events, bookmarks, orders, orderItems };
}

async function expectTelemetryError(
  action: () => Promise<unknown>,
  code: RecommendationTelemetryError["code"],
): Promise<void> {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof RecommendationTelemetryError);
    assert.equal(error.code, code);
    return true;
  });
}

async function writeReport(report: Record<string, unknown>): Promise<string> {
  const directory = path.resolve("outputs", "telemetry");
  await mkdir(directory, { recursive: true });
  const filePath = path.join(
    directory,
    `${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}-integration.json`,
  );
  await writeFile(filePath, JSON.stringify(report, null, 2) + "\n", {
    encoding: "utf-8",
    flag: "wx",
  });
  return filePath;
}

async function main(): Promise<void> {
  const target = assertSafeDatabase({
    operation: "destructive",
    databaseUrl: process.env.DATABASE_URL,
    allowedDatabases: process.env.ALLOWED_DESTRUCTIVE_DATABASES,
  });
  assert.equal(target.databaseName, "bookverse_ai_test");

  const prefix = `IT-F1-${Date.now()}-${process.pid}`;
  const ownerId = `${prefix}-OWNER`;
  const otherId = `${prefix}-OTHER`;
  const lockedId = `${prefix}-LOCKED`;
  const orderIds = [`${prefix}-VALID`, `${prefix}-CANCELLED`, `${prefix}-REFUNDED`];
  const before = await counts();
  const books = await prisma.book.findMany({ orderBy: { id: "asc" }, take: 4, select: { id: true } });
  assert.equal(books.length, 4, "Test cần tối thiểu bốn Book.");

  try {
    await prisma.user.createMany({
      data: [
        { id: ownerId, name: "F1 owner" },
        { id: otherId, name: "F1 other" },
        { id: lockedId, name: "F1 locked", isLocked: true, lockedAt: new Date() },
      ],
    });

    process.env.RECOMMENDATION_PILOT_MODE = "consented";
    process.env.RECOMMENDATION_PILOT_ID = "integration-pilot";
    process.env.RECOMMENDATION_CONSENT_VERSION = "v1";
    process.env.RECOMMENDATION_EXPERIMENT_GROUP = "integration-a";
    const normalizedSnapshot = await createRecommendationRequestSnapshotResult({
      userId: ownerId,
      algorithmVersion: "integration-fixture-v1",
      surface: RecommendationSurface.HOME,
      candidateProfile: "integration",
      filterProfile: "integration",
      items: [
        {
          bookId: books[0].id,
          position: 1,
          score: 9.5,
          evidence: "current",
          source: "CURRENT",
          sourceComponent: "BEHAVIOR",
        },
        { bookId: books[1].id, position: 1, score: 8.5, evidence: "legacy", source: "LEGACY" },
        { bookId: books[0].id, position: 2, score: 7.5, evidence: "duplicate Book" },
        { bookId: books[2].id, position: 0, score: 6.5, evidence: "invalid rank" },
      ],
    });
    delete process.env.RECOMMENDATION_PILOT_MODE;
    delete process.env.RECOMMENDATION_PILOT_ID;
    delete process.env.RECOMMENDATION_CONSENT_VERSION;
    delete process.env.RECOMMENDATION_EXPERIMENT_GROUP;
    assert.equal(normalizedSnapshot.trackingStatus, "TRACKED");
    assert.equal(normalizedSnapshot.trackingReason, "DUPLICATE_BOOK_NORMALIZED");
    const requestId = normalizedSnapshot.requestId;
    assert.ok(requestId);
    const requestMetadata = await prisma.recommendationRequest.findUniqueOrThrow({
      where: { id: requestId },
      select: {
        collectionContext: true,
        pilotId: true,
        consentVersion: true,
        experimentGroup: true,
      },
    });
    assert.deepEqual(requestMetadata, {
      collectionContext: RecommendationCollectionContext.PILOT_CONSENTED,
      pilotId: "integration-pilot",
      consentVersion: "v1",
      experimentGroup: "integration-a",
    });

    const normalizedItems = await prisma.recommendationRequestItem.findMany({
      where: { requestId },
      orderBy: { position: "asc" },
      select: {
        bookId: true,
        position: true,
        score: true,
        evidence: true,
        sourceComponent: true,
      },
    });
    assert.deepEqual(normalizedItems.map((item) => item.position), [1, 2, 3]);
    assert.deepEqual(normalizedItems.map((item) => item.bookId), books.slice(0, 3).map((book) => book.id));
    assert.deepEqual(normalizedItems.map((item) => item.score), [9.5, 8.5, 6.5]);
    assert.equal(normalizedItems[0]?.sourceComponent, "BEHAVIOR");

    const beforeAtomicFailure = await Promise.all([
      prisma.recommendationRequest.count({ where: { userId: ownerId } }),
      prisma.recommendationRequestItem.count({ where: { request: { userId: ownerId } } }),
    ]);
    const atomicFailure = await createRecommendationRequestSnapshotResult({
      userId: ownerId,
      algorithmVersion: "integration-atomic-failure-v1",
      surface: RecommendationSurface.RECOMMENDATION_API,
      candidateProfile: "integration",
      filterProfile: "integration",
      items: [
        { bookId: books[0].id, position: 1, score: 1 },
        { bookId: `${prefix}-BOOK-NOT-FOUND`, position: 2, score: 0.5 },
      ],
    });
    assert.equal(atomicFailure.trackingStatus, "DEGRADED");
    assert.equal(atomicFailure.requestId, null);
    const afterAtomicFailure = await Promise.all([
      prisma.recommendationRequest.count({ where: { userId: ownerId } }),
      prisma.recommendationRequestItem.count({ where: { request: { userId: ownerId } } }),
    ]);
    assert.deepEqual(afterAtomicFailure, beforeAtomicFailure, "Transaction lỗi không được để lại request mồ côi.");

    const concurrentSnapshots = await Promise.all([
      createRecommendationRequestSnapshotResult({
        userId: ownerId,
        algorithmVersion: "integration-concurrent-a-v1",
        surface: RecommendationSurface.RECOMMENDATION_API,
        candidateProfile: "integration-a",
        filterProfile: "integration",
        items: [
          { bookId: books[0].id, position: 1, score: 3 },
          { bookId: books[1].id, position: 1, score: 2 },
        ],
      }),
      createRecommendationRequestSnapshotResult({
        userId: ownerId,
        algorithmVersion: "integration-concurrent-b-v1",
        surface: RecommendationSurface.DASHBOARD,
        candidateProfile: "integration-b",
        filterProfile: "integration",
        items: [
          { bookId: books[2].id, position: 9, score: 5 },
          { bookId: books[1].id, position: 20, score: 4 },
        ],
      }),
    ]);
    assert.ok(concurrentSnapshots.every((item) => item.trackingStatus === "TRACKED" && item.requestId));
    const concurrentSnapshotIds = concurrentSnapshots.map((item) => item.requestId as string);
    assert.equal(new Set(concurrentSnapshotIds).size, 2, "Hai request đồng thời phải có ID độc lập.");
    const concurrentSnapshotItems = await prisma.recommendationRequestItem.findMany({
      where: { requestId: { in: concurrentSnapshotIds } },
      orderBy: [{ requestId: "asc" }, { position: "asc" }],
      select: { requestId: true, bookId: true, position: true },
    });
    for (const concurrentId of concurrentSnapshotIds) {
      const requestItems = concurrentSnapshotItems.filter((item) => item.requestId === concurrentId);
      assert.deepEqual(requestItems.map((item) => item.position), [1, 2]);
      assert.equal(new Set(requestItems.map((item) => item.bookId)).size, 2);
    }

    const impression = await recordRecommendationTelemetry({
      currentUserId: ownerId,
      requestId,
      bookId: books[0].id,
      eventType: "IMPRESSION",
      deviceClass: RecommendationDeviceClass.MOBILE,
    });
    const duplicateImpression = await recordRecommendationTelemetry({
      currentUserId: ownerId,
      requestId,
      bookId: books[0].id,
      eventType: "IMPRESSION",
      deviceClass: RecommendationDeviceClass.MOBILE,
    });
    assert.equal(impression.duplicate, false);
    assert.equal(duplicateImpression.duplicate, true);
    assert.equal(impression.eventId, duplicateImpression.eventId);
    const storedImpression = await prisma.recommendationTelemetryEvent.findUniqueOrThrow({
      where: { id: impression.eventId },
      select: { deviceClass: true },
    });
    assert.equal(storedImpression.deviceClass, RecommendationDeviceClass.MOBILE);

    const click = await recordRecommendationTelemetry({
      currentUserId: ownerId,
      requestId,
      bookId: books[0].id,
      eventType: "CLICK",
      deviceClass: RecommendationDeviceClass.MOBILE,
    });
    const duplicateClick = await recordRecommendationTelemetry({
      currentUserId: ownerId,
      requestId,
      bookId: books[0].id,
      eventType: "CLICK",
      deviceClass: RecommendationDeviceClass.MOBILE,
    });
    assert.equal(click.duplicate, false);
    assert.equal(duplicateClick.duplicate, true);

    await expectTelemetryError(
      () =>
        recordRecommendationTelemetry({
          currentUserId: otherId,
          requestId,
          bookId: books[0].id,
          eventType: "CLICK",
        }),
      "REQUEST_FORBIDDEN",
    );
    await expectTelemetryError(
      () =>
        recordRecommendationTelemetry({
          currentUserId: ownerId,
          requestId,
          bookId: books[3].id,
          eventType: "CLICK",
        }),
      "BOOK_NOT_IN_REQUEST",
    );

    const lockedRequestId = await createRecommendationRequestSnapshot({
      userId: lockedId,
      algorithmVersion: "integration-fixture-v1",
      surface: RecommendationSurface.HOME,
      candidateProfile: "integration",
      filterProfile: "integration",
      items: [{ bookId: books[0].id, position: 1, score: 1 }],
    });
    assert.ok(lockedRequestId);
    await expectTelemetryError(
      () =>
        recordRecommendationTelemetry({
          currentUserId: lockedId,
          requestId: lockedRequestId,
          bookId: books[0].id,
          eventType: "IMPRESSION",
        }),
      "ACCOUNT_NOT_ALLOWED",
    );

    const concurrentRequestId = await createRecommendationRequestSnapshot({
      userId: ownerId,
      algorithmVersion: "integration-concurrency-v1",
      surface: RecommendationSurface.HOME,
      candidateProfile: "integration",
      filterProfile: "integration",
      items: [{ bookId: books[1].id, position: 1, score: 2 }],
    });
    assert.ok(concurrentRequestId);
    await Promise.all(
      Array.from({ length: 12 }, () =>
        recordRecommendationTelemetry({
          currentUserId: ownerId,
          requestId: concurrentRequestId,
          bookId: books[1].id,
          eventType: "IMPRESSION",
        }),
      ),
    );
    const concurrentImpressionRows = await prisma.recommendationTelemetryEvent.count({
      where: { requestId: concurrentRequestId, type: RecommendationTelemetryType.IMPRESSION },
    });
    assert.equal(concurrentImpressionRows, 1);

    await prisma.bookmark.create({
      data: { id: `${prefix}-BOOKMARK`, userId: ownerId, bookId: books[0].id, pageNumber: 1 },
    });
    await prisma.order.createMany({
      data: [
        { id: orderIds[0], buyerId: ownerId, status: OrderStatus.COMPLETED, totalAmount: 100_000 },
        { id: orderIds[1], buyerId: ownerId, status: OrderStatus.CANCELLED, totalAmount: 100_000 },
        { id: orderIds[2], buyerId: ownerId, status: OrderStatus.REFUNDED, totalAmount: 100_000 },
      ],
    });
    await prisma.orderItem.createMany({
      data: orderIds.map((orderId, index) => ({
        id: `${prefix}-OI-${index}`,
        orderId,
        bookId: books[0].id,
        quantity: 1,
        unitPrice: 100_000,
        totalPrice: 100_000,
      })),
    });

    const firstSync = await syncRecommendationConversionsForUser(ownerId);
    const secondSync = await syncRecommendationConversionsForUser(ownerId);
    assert.equal(firstSync, 2, "Chỉ Bookmark và COMPLETED purchase được attribute.");
    assert.equal(secondSync, 0, "Conversion sync phải idempotent.");
    const conversions = await prisma.recommendationTelemetryEvent.findMany({
      where: { requestId, type: RecommendationTelemetryType.CONVERSION },
      orderBy: { sourceType: "asc" },
      select: { sourceType: true, attributionAnchor: true, deviceClass: true },
    });
    assert.deepEqual(
      conversions.map((item) => item.sourceType),
      ["BOOKMARK", "ORDER_ITEM"],
    );
    assert.ok(conversions.every((item) => item.attributionAnchor === "LAST_CLICK"));
    assert.ok(
      conversions.every(
        (item) => item.deviceClass === RecommendationDeviceClass.MOBILE,
      ),
    );

    const during = await counts();
    const report = {
      status: "PASS",
      databaseName: target.databaseName,
      requestId,
      normalization: normalizedSnapshot.normalization,
      normalizedPositions: normalizedItems.map((item) => item.position),
      atomicRollback: afterAtomicFailure.join("|") === beforeAtomicFailure.join("|"),
      concurrentSnapshotIds,
      concurrentSnapshotsIndependent: new Set(concurrentSnapshotIds).size === 2,
      impressionIdempotent: true,
      clickIdempotent: true,
      nonOwnerBlocked: true,
      lockedUserBlocked: true,
      arbitraryBookBlocked: true,
      concurrentImpressionRows,
      validConversions: conversions.length,
      cancelledRefundedConversions: 0,
      conversionSyncIdempotent: secondSync === 0,
      before,
      during,
    };
    const reportPath = await writeReport(report);
    console.log("[PASS] Recommendation telemetry integration");
    console.log("[REPORT] " + path.relative(process.cwd(), reportPath));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await prisma.recommendationRequest.deleteMany({
      where: { userId: { in: [ownerId, otherId, lockedId] } },
    });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.bookmark.deleteMany({ where: { userId: ownerId, id: { startsWith: prefix } } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId, lockedId] } } });
    const after = await counts();
    assert.deepEqual(after, before, "Cleanup telemetry integration phải đưa count về baseline.");
    console.log(JSON.stringify({ cleanup: "PASS", after }, null, 2));
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Telemetry integration lỗi không xác định.";
  console.error("[FAIL] " + message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[DATABASE_URL_REDACTED]"));
  process.exitCode = 1;
});
