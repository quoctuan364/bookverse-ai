import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateSellerQualityScore,
  SELLER_QUALITY_FORMULA_VERSION,
} from "@/lib/seller-score";

const baseInput = {
  completedOrders: 2,
  cancelledOrders: 1,
  reportedListings: 0,
  longDescriptionListings: 3,
  approvedListings: 3,
  totalListings: 4,
};

test("điểm chất lượng seller deterministic và có version", () => {
  const first = calculateSellerQualityScore(baseInput);
  const second = calculateSellerQualityScore({ ...baseInput });

  assert.deepEqual(first, second);
  assert.equal(first.formulaVersion, SELLER_QUALITY_FORMULA_VERSION);
  assert.equal(first.score, 79);
});

test("đơn hoàn tất tăng điểm, đơn hủy và report giảm điểm", () => {
  const baseline = calculateSellerQualityScore(baseInput).score;
  const moreCompleted = calculateSellerQualityScore({ ...baseInput, completedOrders: 5 }).score;
  const moreCancelled = calculateSellerQualityScore({ ...baseInput, cancelledOrders: 4 }).score;
  const moreReported = calculateSellerQualityScore({ ...baseInput, reportedListings: 3 }).score;

  assert.ok(moreCompleted > baseline);
  assert.ok(moreCancelled < baseline);
  assert.ok(moreReported < baseline);
});

test("count không hợp lệ được chuẩn hóa và score luôn trong 0..100", () => {
  const low = calculateSellerQualityScore({
    completedOrders: Number.NaN,
    cancelledOrders: 999,
    reportedListings: 999,
    longDescriptionListings: -1,
    approvedListings: -1,
    totalListings: -1,
  });
  const high = calculateSellerQualityScore({
    completedOrders: 999,
    cancelledOrders: 0,
    reportedListings: 0,
    longDescriptionListings: 10,
    approvedListings: 10,
    totalListings: 10,
  });

  assert.equal(low.score, 30);
  assert.equal(high.score, 100);
  assert.equal(low.facts.completedOrders, 0);
  assert.equal(low.facts.totalListings, 0);
});
