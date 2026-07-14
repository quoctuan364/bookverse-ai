import assert from "node:assert/strict";
import test from "node:test";

import {
  TelemetryRateLimiter,
  calculateInstrumentedCtr,
  isAttributablePurchaseStatus,
  parseTelemetryPayload,
  qualifiesAsImpression,
  selectConversionAttributions,
} from "@/lib/recommendation-telemetry-policy";

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
