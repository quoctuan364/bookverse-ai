import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDemoBookPages,
  DEMO_CONTENT_DISCLAIMER,
} from "../lib/demo-book-content";

const metadata = {
  bookId: "B-DEMO-001",
  title: "Hành trình dữ liệu",
  authorName: "Tác giả minh họa",
  categoryName: "Công nghệ",
};

test("nội dung demo có đủ 8 chương, 32 trang và nhãn phân biệt nguyên tác", () => {
  const pages = buildDemoBookPages(metadata);

  assert.equal(pages.length, 32);
  assert.equal(new Set(pages.map((page) => page.chapterNumber)).size, 8);
  assert.deepEqual(
    pages.map((page) => page.pageNumber),
    Array.from({ length: 32 }, (_, index) => index + 1),
  );
  assert.match(pages[0].content, new RegExp(DEMO_CONTENT_DISCLAIMER));
});

test("bộ sinh deterministic nhưng tạo nội dung khác nhau giữa các trang và sách", () => {
  const first = buildDemoBookPages(metadata);
  const second = buildDemoBookPages(metadata);
  const anotherBook = buildDemoBookPages({
    ...metadata,
    bookId: "B-DEMO-002",
    title: "Một hệ thống khác",
  });

  assert.deepEqual(first, second);
  assert.equal(new Set(first.map((page) => page.content)).size, first.length);
  assert.notEqual(first[1].content, anotherBook[1].content);
});

test("hồ sơ chủ đề làm nội dung công nghệ khác nội dung văn học", () => {
  const technology = buildDemoBookPages(metadata);
  const literature = buildDemoBookPages({
    ...metadata,
    bookId: "B-DEMO-LIT",
    categoryName: "Văn học",
  });

  assert.match(technology[1].content, /dữ liệu|thuật toán|giao diện|tự động hóa/u);
  assert.match(literature[1].content, /điểm nhìn|xung đột|ký ức|biểu tượng/u);
});
