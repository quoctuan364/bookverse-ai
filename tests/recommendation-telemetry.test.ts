import assert from "node:assert/strict";
import test from "node:test";

import { RecommendationSurface } from "@prisma/client";

import {
  TelemetryRateLimiter,
  calculateInstrumentedCtr,
  classifyRecommendationDevice,
  isAttributablePurchaseStatus,
  parseTelemetryPayload,
  qualifiesAsImpression,
  resolveCollectionMetadata,
  selectConversionAttributions,
} from "@/lib/recommendation-telemetry-policy";
import { createRecommendationRequestSnapshotResult } from "@/lib/recommendation-telemetry";

test("client chỉ được gửi requestId/bookId/eventType, score/rank/userId giả bị bỏ", () => {
  const parsed = parseTelemetryPayload({
    requestId: "REQ_1",
    bookId: "B001",
    eventType: "CLICK",
    userId: "ATTACKER",
    position: 999,
    score: 999,
  });
  assert.deepEqual(parsed, { requestId: "REQ_1", bookId: "B001", eventType: "CLICK" });
  assert.throws(() => parseTelemetryPayload({ requestId: "REQ_1", bookId: "B001", eventType: "VIEW" }));
});

test("impression cần tối thiểu 50 phần trăm liên tục 1 giây", () => {
  assert.equal(qualifiesAsImpression(0.49, 5_000), false);
  assert.equal(qualifiesAsImpression(0.5, 999), false);
  assert.equal(qualifiesAsImpression(0.5, 1_000), true);
});

test("last-click được ưu tiên, conversion trước exposure và ngoài window bị loại", () => {
  const base = new Date("2026-07-15T00:00:00Z");
  const exposures = [
    {
      requestId: "R1",
      requestItemId: "I1",
      bookId: "B1",
      type: "IMPRESSION" as const,
      occurredAt: base,
    },
    {
      requestId: "R2",
      requestItemId: "I2",
      bookId: "B1",
      type: "CLICK" as const,
      occurredAt: new Date(base.getTime() + 2_000),
    },
  ];
  const result = selectConversionAttributions(
    exposures,
    [
      {
        bookId: "B1",
        sourceType: "BOOKMARK",
        sourceId: "M1",
        canonicalEvent: "BOOKMARK_ADD",
        occurredAt: new Date(base.getTime() + 5_000),
      },
      {
        bookId: "B1",
        sourceType: "REVIEW",
        sourceId: "RV-BEFORE",
        canonicalEvent: "REVIEW_CREATE",
        occurredAt: new Date(base.getTime() - 1),
      },
      {
        bookId: "B1",
        sourceType: "FAVORITE",
        sourceId: "F-LATE",
        canonicalEvent: "FAVORITE_ADD",
        occurredAt: new Date(base.getTime() + 20_000),
      },
    ],
    10_000,
  );
  assert.equal(result.length, 1);
  assert.equal(result[0]?.exposure.requestItemId, "I2");
  assert.equal(result[0]?.anchor, "LAST_CLICK");
});

test("CANCELLED và REFUNDED không phải conversion purchase", () => {
  assert.equal(isAttributablePurchaseStatus("PAID"), true);
  assert.equal(isAttributablePurchaseStatus("COMPLETED"), true);
  assert.equal(isAttributablePurchaseStatus("CANCELLED"), false);
  assert.equal(isAttributablePurchaseStatus("REFUNDED"), false);
  assert.equal(isAttributablePurchaseStatus("PENDING"), false);
});

test("CTR dùng impression thật làm mẫu số và deduplicate item", () => {
  assert.deepEqual(calculateInstrumentedCtr([], ["I1"]), {
    status: "NOT_AVAILABLE",
    impressions: 0,
    clicks: 1,
    ctr: null,
  });
  assert.deepEqual(calculateInstrumentedCtr(["I1", "I1", "I2"], ["I1", "I3"]), {
    status: "AVAILABLE",
    impressions: 2,
    clicks: 1,
    ctr: 0.5,
  });
});

test("rate limiter chặn sau giới hạn và reset đúng window", () => {
  const limiter = new TelemetryRateLimiter(2, 1_000);
  assert.equal(limiter.allow("U1", 0), true);
  assert.equal(limiter.allow("U1", 10), true);
  assert.equal(limiter.allow("U1", 20), false);
  assert.equal(limiter.allow("U1", 1_000), true);
});

test("device được suy từ user-agent phía server", () => {
  assert.equal(
    classifyRecommendationDevice("Mozilla/5.0 (iPhone; Mobile)"),
    "MOBILE",
  );
  assert.equal(
    classifyRecommendationDevice("Mozilla/5.0 (iPad; Tablet)"),
    "TABLET",
  );
  assert.equal(
    classifyRecommendationDevice("Mozilla/5.0 (Windows NT 10.0)"),
    "DESKTOP",
  );
  assert.equal(classifyRecommendationDevice(null), "UNKNOWN");
});

test("pilot chỉ được gắn nhãn consent khi cấu hình đầy đủ", () => {
  assert.deepEqual(resolveCollectionMetadata({}), {
    collectionContext: "STANDARD_APP",
    pilotId: null,
    consentVersion: null,
    experimentGroup: null,
  });
  assert.equal(
    resolveCollectionMetadata({
      RECOMMENDATION_PILOT_MODE: "consented",
      RECOMMENDATION_PILOT_ID: "pilot-2026",
    }).collectionContext,
    "STANDARD_APP",
  );
  assert.deepEqual(
    resolveCollectionMetadata({
      RECOMMENDATION_PILOT_MODE: "consented",
      RECOMMENDATION_PILOT_ID: "pilot-2026",
      RECOMMENDATION_CONSENT_VERSION: "v1",
      RECOMMENDATION_EXPERIMENT_GROUP: "behavior-shadow",
    }),
    {
      collectionContext: "PILOT_CONSENTED",
      pilotId: "pilot-2026",
      consentVersion: "v1",
      experimentGroup: "behavior-shadow",
    },
  );
});

test("persistence failure trả degraded contract và không lộ raw error", async () => {
  const logs: string[] = [];
  const originalError = console.error;
  console.error = (...values: unknown[]) => logs.push(values.map(String).join(" "));
  try {
    const result = await createRecommendationRequestSnapshotResult(
      {
        userId: "U1",
        algorithmVersion: "unit-v1",
        surface: RecommendationSurface.HOME,
        candidateProfile: "unit",
        filterProfile: "unit",
        items: [{ bookId: "B1", position: 1, score: 9 }],
      },
      {
        persist: async () => {
          throw new Error("postgresql://secret-user:secret-password@database/private-sql");
        },
      },
    );
    assert.equal(result.requestId, null);
    assert.equal(result.trackingStatus, "DEGRADED");
    assert.equal(result.trackingReason, "PERSISTENCE_UNAVAILABLE");
    assert.equal(logs.some((line) => line.includes("secret-password")), false);
    assert.equal(logs.some((line) => line.includes("private-sql")), false);
  } finally {
    console.error = originalError;
  }
});
