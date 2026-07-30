import assert from "node:assert/strict";
import test from "node:test";

import { buildLockedFinalV2Manifest } from "@/lib/recommendation-final-v2";

function readyExport() {
  return {
    schemaVersion: "bookverse-pilot-export-v1",
    datasetSha256: "DATASET",
    readiness: { decision: "READY_FOR_FINAL_V2_ASSESSMENT" },
    requests: Array.from({ length: 10 }, (_, userIndex) => {
      const items = Array.from({ length: 20 }, (_, bookIndex) => ({
        requestItemId: `I-${userIndex}-${bookIndex}`,
        bookId: `B-${bookIndex}`,
      }));
      const finalItemIndexes = Array.from(
        { length: 10 },
        (_, offset) => (userIndex * 2 + offset) % 20,
      );
      return {
        requestId: `R-${userIndex}`,
        userId: `U-${userIndex}`,
        algorithmVersion: "behavior-v1",
        generatedAt: "2026-01-01T00:00:00Z",
        items,
        events: [
          {
            eventId: `TRAIN-${userIndex}`,
            requestItemId: items[0].requestItemId,
            type: "IMPRESSION" as const,
            occurredAt: "2026-01-10T00:00:00Z",
          },
          ...[0, 1].flatMap((bookIndex) => [
            {
              eventId: `VALID-I-${userIndex}-${bookIndex}`,
              requestItemId: items[bookIndex].requestItemId,
              type: "IMPRESSION" as const,
              occurredAt: "2026-02-10T00:00:00Z",
            },
            {
              eventId: `VALID-C-${userIndex}-${bookIndex}`,
              requestItemId: items[bookIndex].requestItemId,
              type: "CLICK" as const,
              occurredAt: "2026-02-10T00:01:00Z",
            },
          ]),
          ...finalItemIndexes.map((bookIndex) => ({
            eventId: `FINAL-I-${userIndex}-${bookIndex}`,
            requestItemId: items[bookIndex].requestItemId,
            type: "IMPRESSION" as const,
            occurredAt: "2026-03-10T00:00:00Z",
          })),
          ...finalItemIndexes.slice(0, 2).map((bookIndex) => ({
            eventId: `FINAL-C-${userIndex}-${bookIndex}`,
            requestItemId: items[bookIndex].requestItemId,
            type: "CLICK" as const,
            occurredAt: "2026-03-10T00:01:00Z",
          })),
        ],
      };
    }),
  };
}

test("final_v2 locker không tính metric và chỉ mở khi split đủ điều kiện", () => {
  const result = buildLockedFinalV2Manifest(
    readyExport(),
    "2026-02-01T00:00:00Z",
    "2026-03-01T00:00:00Z",
  );
  assert.equal(result.decision, "READY_FOR_MODELING");
  assert.equal(result.finalV2MetricStatus, "LOCKED_NOT_COMPUTED");
  assert.equal(result.preFinalV2Readiness.validation.positiveUsers, 10);
  assert.equal(result.preFinalV2Readiness.finalV2.positiveEvents, 20);
  assert.equal(result.preFinalV2Readiness.finalV2.candidateCatalog, 20);
  assert.equal("metrics" in result, false);
});

test("không đủ dữ liệu phải BLOCKED_BY_DATA", () => {
  const result = buildLockedFinalV2Manifest(
    {
      schemaVersion: "bookverse-pilot-export-v1",
      datasetSha256: "EMPTY",
      readiness: { decision: "BLOCKED_BY_DATA" },
      requests: [],
    },
    "2026-02-01T00:00:00Z",
    "2026-03-01T00:00:00Z",
  );
  assert.equal(result.decision, "BLOCKED_BY_DATA");
  assert.ok(result.failureReasons.includes("final_v2 window rỗng"));
});
