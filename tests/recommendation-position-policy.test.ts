import assert from "node:assert/strict";
import test from "node:test";

import {
  dedupeRecommendationEvidence,
  normalizeRecommendationCandidates,
  type RecommendationCandidate,
  type RecommendationCandidateSource,
} from "@/lib/recommendation-position-policy";

interface Fixture {
  label: string;
}

function candidate(
  bookId: string,
  rank: number | null,
  score: number,
  source: RecommendationCandidateSource = "CURRENT",
  productionOrder?: number,
): RecommendationCandidate<Fixture> {
  return {
    bookId,
    rank,
    score,
    source,
    productionOrder,
    evidence: `evidence-${bookId}`,
    payload: { label: bookId },
  };
}

test("hai Book cùng rank được gán position 1, 2", () => {
  const result = normalizeRecommendationCandidates(
    [candidate("B1", 1, 9), candidate("B2", 1, 8)],
    10,
  );
  assert.deepEqual(result.items.map((item) => item.position), [1, 2]);
  assert.equal(result.stats.duplicateRankCount, 1);
  assert.equal(result.reason, "TRACKED");
});

test("ba nguồn cùng rank vẫn có position duy nhất", () => {
  const result = normalizeRecommendationCandidates(
    [
      candidate("B1", 1, 9, "CURRENT"),
      candidate("B2", 1, 8, "DAILY"),
      candidate("B3", 1, 7, "LEGACY"),
    ],
    10,
  );
  assert.deepEqual(result.items.map((item) => item.position), [1, 2, 3]);
  assert.equal(new Set(result.items.map((item) => item.position)).size, 3);
});

test("Book trùng legacy/current chỉ giữ một candidate theo policy", () => {
  const result = normalizeRecommendationCandidates(
    [
      { ...candidate("B1", 1, 8, "LEGACY", 0), evidence: "legacy evidence" },
      { ...candidate("B1", 1, 9, "CURRENT", 0), evidence: "current evidence" },
    ],
    10,
  );
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.source, "CURRENT");
  assert.equal(result.items[0]?.score, 9);
  assert.equal(result.items[0]?.evidence, "current evidence");
  assert.equal(result.stats.duplicateBookCount, 1);
  assert.equal(result.reason, "DUPLICATE_BOOK_NORMALIZED");
});

test("rank null, 0 và âm được normalize thay vì loại Book", () => {
  const result = normalizeRecommendationCandidates(
    [candidate("B1", null, 3), candidate("B2", 0, 2), candidate("B3", -4, 1)],
    10,
  );
  assert.deepEqual(result.items.map((item) => item.position), [1, 2, 3]);
  assert.equal(result.stats.invalidRankCount, 3);
  assert.equal(result.reason, "INVALID_RANK_NORMALIZED");
});

test("rank có khoảng trống vẫn cho position liên tục", () => {
  const result = normalizeRecommendationCandidates(
    [candidate("B1", 2, 3), candidate("B2", 8, 2), candidate("B3", 100, 1)],
    10,
  );
  assert.deepEqual(result.items.map((item) => item.position), [1, 2, 3]);
});

test("top K deterministic và không đổi thứ tự production hợp lệ", () => {
  const input = Array.from({ length: 8 }, (_, index) =>
    candidate(`B${index + 1}`, index + 1, 100 - index),
  );
  const first = normalizeRecommendationCandidates(input, 5);
  const second = normalizeRecommendationCandidates(input, 5);
  assert.deepEqual(first, second);
  assert.deepEqual(first.items.map((item) => item.bookId), ["B1", "B2", "B3", "B4", "B5"]);
  assert.equal(first.stats.truncatedCount, 3);
});

test("evidence trùng bị loại nhưng evidence khác nguồn được giữ", () => {
  const evidence = dedupeRecommendationEvidence([
    { type: "BEHAVIOR", label: "Cùng thể loại", sourceType: "BOOK", sourceId: "B1" },
    { type: "BEHAVIOR", label: "Cùng thể loại", sourceType: "BOOK", sourceId: "B1" },
    { type: "TRENDING", label: "Đang nổi bật", sourceType: "BOOK", sourceId: "B1" },
  ]);
  assert.equal(evidence.length, 2);
});

test("normalize không cộng hoặc thay score", () => {
  const result = normalizeRecommendationCandidates(
    [candidate("B1", 1, 9.25), candidate("B2", 1, 7.75)],
    10,
  );
  assert.deepEqual(result.items.map((item) => item.score), [9.25, 7.75]);
});

test("empty recommendation trả kết quả validation an toàn", () => {
  const result = normalizeRecommendationCandidates([], 10);
  assert.deepEqual(result.items, []);
  assert.equal(result.reason, "REQUEST_VALIDATION_FAILED");
});

test("một Book duy nhất có position 1", () => {
  const result = normalizeRecommendationCandidates([candidate("B1", null, 1)], 10);
  assert.equal(result.items[0]?.position, 1);
  assert.equal(result.items[0]?.score, 1);
});
