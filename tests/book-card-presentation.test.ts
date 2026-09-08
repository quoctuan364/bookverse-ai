import assert from "node:assert/strict";
import test from "node:test";

import {
  getBookCardMetadataBadge,
  getRecommendationEvidencePresentation,
} from "@/lib/book-card-presentation";

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

test("sở thích khai báo được ghi nhãn category fallback, không giả thành AI", () => {
  const presentation = getRecommendationEvidencePresentation(
    "Vì bạn đã chọn Kinh doanh là thể loại yêu thích.",
    "CATEGORY_FALLBACK",
  );

  assert.equal(presentation.hasVerifiedEvidence, false);
  assert.equal(presentation.badgeLabel, "Gợi ý từ sở thích");
  assert.equal(presentation.evidenceLabel, "Vì sao:");
  assert.equal(
    presentation.evidenceText,
    "Vì bạn đã chọn Kinh doanh là thể loại yêu thích.",
  );
});

test("BookCard không lặp nhãn dữ liệu demo", () => {
  assert.equal(getBookCardMetadataBadge("Dữ liệu demo"), null);
  assert.equal(getBookCardMetadataBadge("Sách tuyển chọn"), "Sách tuyển chọn");
});
