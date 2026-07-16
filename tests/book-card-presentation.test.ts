import assert from "node:assert/strict";
import test from "node:test";

import { getRecommendationEvidencePresentation } from "@/lib/book-card-presentation";

test("chỉ gắn nhãn AI khi có evidence thật không rỗng", () => {
  const presentation = getRecommendationEvidencePresentation("  Vì bạn đã đọc sách cùng chủ đề.  ");

  assert.equal(presentation.hasVerifiedEvidence, true);
  assert.equal(presentation.badgeLabel, "AI gợi ý");
  assert.equal(presentation.evidenceText, "Vì bạn đã đọc sách cùng chủ đề.");
});

test("không có evidence thì dùng trạng thái trung tính, không dựng lý do cá nhân hóa", () => {
  for (const evidence of [undefined, null, "", "   "]) {
    const presentation = getRecommendationEvidencePresentation(evidence);
    assert.equal(presentation.hasVerifiedEvidence, false);
    assert.equal(presentation.badgeLabel, "Sách trong danh mục");
    assert.equal(presentation.evidenceLabel, "Trạng thái:");
    assert.match(presentation.evidenceText, /Chưa có giải thích cá nhân hóa/);
  }
});
