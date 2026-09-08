import assert from "node:assert/strict";
import test from "node:test";
import { calculateReadingStreaks } from "../lib/reading-insights-policy";

test("streak hiện tại tính liên tục từ hôm nay", () => {
  assert.deepEqual(
    calculateReadingStreaks(
      ["2026-07-23", "2026-07-24", "2026-07-25", "2026-07-26"],
      ["2026-07-26", "2026-07-25"],
    ),
    { current: 4, longest: 4 },
  );
});

test("streak vẫn còn hiệu lực nếu hôm nay chưa đọc nhưng hôm qua có đọc", () => {
  assert.deepEqual(
    calculateReadingStreaks(
      ["2026-07-20", "2026-07-24", "2026-07-25"],
      ["2026-07-26", "2026-07-25"],
    ),
    { current: 2, longest: 2 },
  );
});

test("ngày trùng không làm tăng streak và khoảng trống tạo chuỗi mới", () => {
  assert.deepEqual(
    calculateReadingStreaks(
      ["2026-07-01", "2026-07-02", "2026-07-02", "2026-07-05"],
      ["2026-07-06", "2026-07-05"],
    ),
    { current: 1, longest: 2 },
  );
});

test("không có phiên đọc trả streak bằng không", () => {
  assert.deepEqual(
    calculateReadingStreaks([], ["2026-07-26", "2026-07-25"]),
    { current: 0, longest: 0 },
  );
});
