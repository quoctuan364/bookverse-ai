import assert from "node:assert/strict";
import test from "node:test";

import {
  assessRecommendationDataReadiness,
  pseudonymizeForExport,
} from "@/lib/recommendation-data-readiness";

test("không có dữ liệu thật phải BLOCKED_BY_DATA", () => {
  const result = assessRecommendationDataReadiness({
    consentedUsers: 0,
    exposedBooks: 0,
    verifiedEvents: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    usersWithThreeEvents: 0,
    usersWithFiveEvents: 0,
    usersWithTenEvents: 0,
    collectionDays: 0,
  });
  assert.equal(result.decision, "BLOCKED_BY_DATA");
  assert.equal(result.operationalMinimumMet, false);
  assert.equal(result.finalV2Eligible, false);
  assert.ok(result.failedChecks.includes("impressions>=500"));
});

test("vượt operational minimum chỉ cho phép đánh giá split, chưa mở final_v2", () => {
  const result = assessRecommendationDataReadiness({
    consentedUsers: 30,
    exposedBooks: 100,
    verifiedEvents: 800,
    impressions: 600,
    clicks: 45,
    conversions: 10,
    usersWithThreeEvents: 30,
    usersWithFiveEvents: 25,
    usersWithTenEvents: 12,
    collectionDays: 30,
  });
  assert.deepEqual(result, {
    decision: "READY_FOR_FINAL_V2_ASSESSMENT",
    operationalMinimumMet: true,
    finalV2Eligible: false,
    statisticalPowerGuaranteed: false,
    failedChecks: [],
  });
});

test("HMAC export ổn định, có namespace và không trả raw ID", () => {
  const key = "0123456789abcdef0123456789abcdef";
  const first = pseudonymizeForExport("USER-1", key, "user");
  const second = pseudonymizeForExport("USER-1", key, "user");
  const book = pseudonymizeForExport("USER-1", key, "book");
  assert.equal(first, second);
  assert.notEqual(first, book);
  assert.equal(first.includes("USER-1"), false);
  assert.throws(() => pseudonymizeForExport("USER-1", "short", "user"));
});
