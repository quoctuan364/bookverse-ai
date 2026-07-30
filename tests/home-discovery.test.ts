import assert from "node:assert/strict";
import test from "node:test";

import {
  rankTrendingBooks,
  uniqueRecentlyViewedBookIds,
} from "../lib/home-discovery";

const now = new Date("2026-07-24T12:00:00.000Z");

test("xếp xu hướng ưu tiên hành động mạnh và tín hiệu mới", () => {
  const ranked = rankTrendingBooks(
    [
      {
        bookId: "RB00001",
        actionType: "BOOK_VIEW",
        createdAt: new Date("2026-07-24T11:00:00.000Z"),
      },
      {
        bookId: "RB00002",
        actionType: "PURCHASE",
        createdAt: new Date("2026-07-22T12:00:00.000Z"),
      },
      {
        bookId: "RB00003",
        actionType: "FAVORITE_ADD",
        createdAt: new Date("2026-07-24T11:00:00.000Z"),
      },
    ],
    now,
  );

  assert.deepEqual(
    ranked.map((item) => item.bookId),
    ["RB00002", "RB00003", "RB00001"],
  );
});

test("gộp nhiều tín hiệu của cùng một sách", () => {
  const ranked = rankTrendingBooks(
    [
      { bookId: "RB00001", actionType: "BOOK_VIEW", createdAt: now },
      { bookId: "RB00001", actionType: "CART_ADD", createdAt: now },
      { bookId: "RB00002", actionType: "BOOK_VIEW", createdAt: now },
    ],
    now,
  );

  assert.equal(ranked[0]?.bookId, "RB00001");
  assert.equal(ranked[0]?.signalCount, 2);
});

test("bỏ qua tín hiệu không hỗ trợ và mã sách rỗng", () => {
  const ranked = rankTrendingBooks(
    [
      { bookId: "", actionType: "BOOK_VIEW", createdAt: now },
      { bookId: "RB00001", actionType: "UNKNOWN", createdAt: now },
    ],
    now,
  );

  assert.deepEqual(ranked, []);
});

test("lịch sử xem khử trùng và giữ lần xem mới nhất", () => {
  const ids = uniqueRecentlyViewedBookIds(
    [
      { bookId: "RB00002", actionType: "BOOK_VIEW", createdAt: now },
      { bookId: "RB00001", actionType: "BOOK_VIEW", createdAt: now },
      { bookId: "RB00002", actionType: "BOOK_VIEW", createdAt: now },
      { bookId: "RB00003", actionType: "PURCHASE", createdAt: now },
    ],
    3,
  );

  assert.deepEqual(ids, ["RB00002", "RB00001"]);
});
