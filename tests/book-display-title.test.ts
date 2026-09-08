import assert from "node:assert/strict";
import test from "node:test";

import {
  getVietnameseBookTitle,
  VIETNAMESE_BOOK_TITLES,
} from "@/lib/book-display-title";

test("20 sách demo đều có nhãn tiếng Việt", () => {
  assert.equal(Object.keys(VIETNAMESE_BOOK_TITLES).length, 20);
  assert.equal(getVietnameseBookTitle("B010", "Atomic Habits"), "Thay đổi tí hon, hiệu quả bất ngờ");
  assert.equal(getVietnameseBookTitle("B020", "Clean Code"), "Mã sạch");
});

test("catalog thật dùng bảng tên tiếng Việt đã sinh sẵn", () => {
  assert.equal(getVietnameseBookTitle("RB03044", "The Three-Body Problem"), "Vấn Đề Ba Thân");
  assert.equal(getVietnameseBookTitle("RB03046", "What I talk about when I talk about running"), "Tôi nói gì khi nói về chạy bộ");
});

test("sách chưa có trong bảng dịch giữ nguyên tên nguồn", () => {
  assert.equal(getVietnameseBookTitle("BOOK-MOI", "Tên sách gốc"), "Tên sách gốc");
});

test("tiêu đề luôn có fallback an toàn, không rỗng hoặc undefined", () => {
  assert.equal(getVietnameseBookTitle("BOOK-MOI", "   "), "Chưa có tiêu đề");
  assert.equal(getVietnameseBookTitle("BOOK-MOI", undefined), "Chưa có tiêu đề");
});
