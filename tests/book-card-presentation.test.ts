import assert from "node:assert/strict";
import test from "node:test";

import { getRecommendationEvidencePresentation } from "@/lib/book-card-presentation";

test("evidence không có provenance không được gắn nhãn AI", () => {
  const presentation = getRecommendationEvidencePresentation("  Vì bạn đã đọc sách cùng chủ đề.  ");
  assert.equal(presentation.hasVerifiedEvidence, false);
  assert.equal(presentation.badgeLabel, "Khám phá thêm");
  assert.equal(presentation.evidenceText, "Chưa có bằng chứng cá nhân hóa đã được xác minh.");
});

test("null/rỗng dùng trạng thái trung tính", () => {
  for (const evidence of [undefined, null, "", "   "]) {
    const presentation = getRecommendationEvidencePresentation(evidence);
    assert.equal(presentation.hasVerifiedEvidence, false);
    assert.equal(presentation.evidenceLabel, "Trạng thái:");
    assert.match(presentation.evidenceText, /chưa có (giải thích cá nhân hóa|bằng chứng cá nhân hóa)/i);
  }
});

test("chỉ provenance REAL_USER_DATA đã xác minh mới hiển thị AI gợi ý", () => {
  const presentation = getRecommendationEvidencePresentation("Vì bạn đã đọc nhiều sách", "VERIFIED_REAL_USER");
  assert.equal(presentation.hasVerifiedEvidence, true);
  assert.equal(presentation.badgeLabel, "AI gợi ý");
  assert.equal(presentation.evidenceText, "Vì bạn đã đọc nhiều sách");
});
