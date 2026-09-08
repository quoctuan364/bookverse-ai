import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateCalendarDays,
  calendarIntensity,
} from "../lib/reading-calendar-policy";

test("aggregateCalendarDays gộp nhiều phiên trong cùng ngày", () => {
  assert.deepEqual(
    aggregateCalendarDays(
      ["2026-01-01", "2026-01-02"],
      [
        { dateKey: "2026-01-01", seconds: 600 },
        { dateKey: "2026-01-01", seconds: 900 },
      ],
    ),
    [
      { dateKey: "2026-01-01", minutes: 25, sessions: 2 },
      { dateKey: "2026-01-02", minutes: 0, sessions: 0 },
    ],
  );
});

test("aggregateCalendarDays bỏ dữ liệu nằm ngoài năm đang xem", () => {
  assert.deepEqual(
    aggregateCalendarDays(
      ["2026-01-01"],
      [{ dateKey: "2025-12-31", seconds: 1200 }],
    ),
    [{ dateKey: "2026-01-01", minutes: 0, sessions: 0 }],
  );
});

test("calendarIntensity chia mức theo tỷ lệ mục tiêu ngày", () => {
  assert.deepEqual(
    [0, 4, 8, 15, 20].map((minutes) => calendarIntensity(minutes, 20)),
    [0, 1, 2, 3, 4],
  );
});

