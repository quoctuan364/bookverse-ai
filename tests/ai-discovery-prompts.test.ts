import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_DISCOVERY_PROMPTS,
  buildAssistantDiscoveryHref,
} from "../lib/ai-discovery-prompts";
import { inferAssistantRequestedLanguage } from "../lib/assistant-language";

test("prompt khám phá AI có mã duy nhất và nội dung hữu ích", () => {
  assert.equal(AI_DISCOVERY_PROMPTS.length, 4);
  assert.equal(new Set(AI_DISCOVERY_PROMPTS.map((prompt) => prompt.id)).size, 4);
  assert.ok(AI_DISCOVERY_PROMPTS.every((prompt) => prompt.query.length >= 30));
});

test("tạo deep link trợ lý an toàn từ câu hỏi tự nhiên", () => {
  assert.equal(buildAssistantDiscoveryHref("   "), "/assistant");
  assert.equal(
    buildAssistantDiscoveryHref("  sách AI   cho người mới "),
    "/assistant?q=s%C3%A1ch%20AI%20cho%20ng%C6%B0%E1%BB%9Di%20m%E1%BB%9Bi",
  );
});

test("nhận diện yêu cầu ngôn ngữ rõ ràng và không đoán khi thiếu tín hiệu", () => {
  assert.equal(inferAssistantRequestedLanguage("Gợi ý sách tiếng Việt để thư giãn"), "vi");
  assert.equal(inferAssistantRequestedLanguage("I want an English book about AI"), "en");
  assert.equal(inferAssistantRequestedLanguage("Tìm sách lập trình cho người mới"), null);
});
