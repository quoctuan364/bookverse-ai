import assert from "node:assert/strict";
import test from "node:test";

import { classifyBookCoverSource, normalizeBookCoverUrl } from "@/lib/book-cover";

test("cover null hoặc rỗng dùng trạng thái EMPTY", () => {
  assert.equal(classifyBookCoverSource(null), "EMPTY");
  assert.equal(normalizeBookCoverUrl("   "), null);
});

test("cover local được chuẩn hóa về public path tuyệt đối", () => {
  assert.equal(normalizeBookCoverUrl("covers/flat/book.svg"), "/covers/flat/book.svg");
  assert.equal(normalizeBookCoverUrl("\\covers\\flat\\book.svg"), "/covers/flat/book.svg");
});

test("cover remote chỉ nhận HTTP hoặc HTTPS hợp lệ", () => {
  assert.equal(classifyBookCoverSource("https://example.com/book.jpg"), "REMOTE");
  assert.equal(normalizeBookCoverUrl("http://example.com/book.jpg"), "http://example.com/book.jpg");
  assert.equal(normalizeBookCoverUrl("javascript:alert(1)"), null);
  assert.equal(normalizeBookCoverUrl("file:///tmp/book.jpg"), null);
});

test("cover local từ chối path traversal và Windows absolute path", () => {
  assert.equal(normalizeBookCoverUrl("../secret.jpg"), null);
  assert.equal(normalizeBookCoverUrl("C:\\covers\\book.jpg"), null);
  assert.equal(normalizeBookCoverUrl("//other-host/book.jpg"), null);
});
