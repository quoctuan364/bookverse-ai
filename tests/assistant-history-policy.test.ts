import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_ASSISTANT_SESSION_TITLE_LENGTH,
  normalizeAssistantSessionTitle,
} from "@/lib/assistant-history-policy";

test("tiêu đề lịch sử chatbot được trim và gom khoảng trắng", () => {
  assert.equal(
    normalizeAssistantSessionTitle("  Sách   dành cho người mới  "),
    "Sách dành cho người mới",
  );
});

test("tiêu đề lịch sử chatbot phải có từ 3 đến 80 ký tự", () => {
  assert.equal(normalizeAssistantSessionTitle("AI"), null);
  assert.equal(
    normalizeAssistantSessionTitle("a".repeat(MAX_ASSISTANT_SESSION_TITLE_LENGTH + 1)),
    null,
  );
  assert.equal(normalizeAssistantSessionTitle("Gợi ý sách"), "Gợi ý sách");
});
