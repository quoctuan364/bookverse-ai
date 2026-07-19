import assert from "node:assert/strict";
import test from "node:test";

import {
  getRecommendationEvidenceStatus,
  isVerifiedRealUserProvenance,
  RECOMMENDATION_ALGORITHM_VERSION,
  RECOMMENDATION_TAXONOMY_VERSION,
} from "@/lib/recommendation-evidence-policy";

const validProvenance = {
  dataLabel: "REAL_USER_DATA" as const,
  interactionId: "interaction-real-1",
  userId: "user-1",
  eventType: "BOOK_VIEW",
  sourceBookId: "B001",
  sourceCategoryId: "C001",
  sourceAuthorName: "Tác giả",
  occurredAt: "2026-07-19T10:00:00.000Z",
  taxonomyVersion: RECOMMENDATION_TAXONOMY_VERSION,
  algorithmVersion: RECOMMENDATION_ALGORITHM_VERSION,
};

test("provenance REAL_USER_DATA đầy đủ mới được xác minh", () => {
  assert.equal(isVerifiedRealUserProvenance(validProvenance, "user-1"), true);
  assert.equal(isVerifiedRealUserProvenance({ ...validProvenance, userId: "user-2" }, "user-1"), false);
  assert.equal(isVerifiedRealUserProvenance({ ...validProvenance, taxonomyVersion: "old" }, "user-1"), false);
});

test("evidence synthetic, thiếu provenance và fallback đều không thành claim cá nhân hóa", () => {
  assert.equal(getRecommendationEvidenceStatus({ evidence: "Vì bạn đã đọc", provenance: { dataLabel: "SYNTHETIC_DATA" } }), "SYNTHETIC_DATA");
  assert.equal(getRecommendationEvidenceStatus({ evidence: "Vì bạn đã đọc" }), "MISSING_PROVENANCE");
  assert.equal(getRecommendationEvidenceStatus({ evidence: null, fallback: "POPULARITY_FALLBACK" }), "POPULARITY_FALLBACK");
  assert.equal(getRecommendationEvidenceStatus({ evidence: "Vì bạn đã đọc", provenance: validProvenance, expectedUserId: "anonymous" }), "MISSING_PROVENANCE");
});
