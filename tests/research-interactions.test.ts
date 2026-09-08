import assert from "node:assert/strict";
import test from "node:test";

import {
  CURRENT_CONSENT_VERSION,
  RESEARCH_EVENT_REQUIRES_BOOK_ID,
  VALID_RESEARCH_EVENT_TYPES,
  sanitizeResearchMetadata,
  toNullableMetadata,
  type ResearchEventType,
} from "@/lib/research-interactions";
import { Prisma } from "@prisma/client";

test("CURRENT_CONSENT_VERSION luôn là v1 theo giao thức", () => {
  assert.equal(CURRENT_CONSENT_VERSION, "v1");
});

test("VALID_RESEARCH_EVENT_TYPES hỗ trợ đủ 9 loại event", () => {
  const expectedEvents: ResearchEventType[] = [
    "IMPRESSION",
    "VIEW",
    "RECOMMENDATION_CLICK",
    "SEARCH",
    "FAVORITE",
    "BOOKMARK",
    "ADD_TO_CART",
    "PURCHASE",
    "RATING",
  ];
  assert.equal(VALID_RESEARCH_EVENT_TYPES.size, 9);
  for (const event of expectedEvents) {
    assert.equal(VALID_RESEARCH_EVENT_TYPES.has(event), true, `Thiếu event: ${event}`);
  }
});

test("SEARCH là event duy nhất không bắt buộc bookId", () => {
  assert.equal(RESEARCH_EVENT_REQUIRES_BOOK_ID.has("SEARCH"), false);
  assert.equal(RESEARCH_EVENT_REQUIRES_BOOK_ID.has("IMPRESSION"), true);
  assert.equal(RESEARCH_EVENT_REQUIRES_BOOK_ID.has("VIEW"), true);
  assert.equal(RESEARCH_EVENT_REQUIRES_BOOK_ID.has("RECOMMENDATION_CLICK"), true);
  assert.equal(RESEARCH_EVENT_REQUIRES_BOOK_ID.has("FAVORITE"), true);
  assert.equal(RESEARCH_EVENT_REQUIRES_BOOK_ID.has("BOOKMARK"), true);
  assert.equal(RESEARCH_EVENT_REQUIRES_BOOK_ID.has("ADD_TO_CART"), true);
  assert.equal(RESEARCH_EVENT_REQUIRES_BOOK_ID.has("PURCHASE"), true);
  assert.equal(RESEARCH_EVENT_REQUIRES_BOOK_ID.has("RATING"), true);
});

test("sanitizeResearchMetadata loại bỏ thông tin nhạy cảm PII", () => {
  const dirty = {
    query: "tiểu thuyết",
    email: "user@example.com",
    phone: "0901234567",
    password: "secretpassword",
    address: "123 Đường ABC",
    name: "Nguyễn Văn A",
    ip: "192.168.1.1",
    validField: 123,
  };

  const sanitized = sanitizeResearchMetadata(dirty);
  assert.deepEqual(sanitized, {
    query: "tiểu thuyết",
    validField: 123,
  });
});

test("sanitizeResearchMetadata trả về Prisma.JsonNull khi metadata rỗng hoặc chỉ có PII", () => {
  assert.equal(sanitizeResearchMetadata(null), Prisma.JsonNull);
  assert.equal(sanitizeResearchMetadata(undefined), Prisma.JsonNull);
  assert.equal(sanitizeResearchMetadata({ email: "test@test.com" }), Prisma.JsonNull);
  assert.equal(sanitizeResearchMetadata([]), Prisma.JsonNull);
  assert.equal(toNullableMetadata(null), Prisma.JsonNull);
});