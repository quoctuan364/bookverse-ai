import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveBookLanguageCode,
  hasVietnameseTitleEvidence,
  normalizeLanguageAlias,
} from "@/lib/book-language";

test("chuẩn hóa mã ngôn ngữ nguồn về ISO 639-1", () => {
  assert.equal(normalizeLanguageAlias("vie"), "vi");
  assert.equal(normalizeLanguageAlias("eng"), "en");
  assert.equal(normalizeLanguageAlias("NOT_AVAILABLE"), null);
});

test("không coi cờ Vietnamese edition là đủ nếu tiêu đề không có dấu hiệu tiếng Việt", () => {
  for (const title of ["At Home", "Aura", "2666", "You and Me, Little Bear"]) {
    assert.notEqual(
      deriveBookLanguageCode({ title, languages: ["vie"], isVietnameseEdition: true }),
      "vi",
    );
  }
});

test("nhận diện tiêu đề tiếng Việt có dấu và tiêu đề nguồn bị mất dấu", () => {
  assert.equal(hasVietnameseTitleEvidence("Án mạng trên chuyến tàu tốc hành Phương Đông"), true);
  assert.equal(hasVietnameseTitleEvidence("Tu do trong luu day"), true);
  assert.equal(
    deriveBookLanguageCode({
      title: "Tu do trong luu day",
      languages: ["vie"],
      isVietnameseEdition: true,
    }),
    "vi",
  );
});
