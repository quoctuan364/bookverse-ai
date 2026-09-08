import assert from "node:assert/strict";
import test from "node:test";

import { selectHomeShelfBooks } from "@/lib/home-shelf-selection";
import type { HomeShelfBook } from "@/lib/home-shelf-types";

function createBook(id: string): HomeShelfBook {
  return {
    id,
    title: `Sách ${id}`,
    author: "Tác giả",
    category: "Văn học",
    coverImage: null,
    price: 100_000,
    sourceRating: null,
    ratingCount: null,
    availableListingId: null,
    isFavorite: false,
  };
}

test("kệ sau ưu tiên sách chưa xuất hiện", () => {
  const seen = new Set(["B001", "B002"]);
  const selected = selectHomeShelfBooks(
    [createBook("B001"), createBook("B002"), createBook("B003"), createBook("B004")],
    seen,
    2,
  );

  assert.deepEqual(selected.map((book) => book.id), ["B003", "B004"]);
});

test("catalog nhỏ được lặp có kiểm soát mà không tạo sách mới", () => {
  const candidates = Array.from({ length: 10 }, (_, index) =>
    createBook(`B${String(index + 1).padStart(3, "0")}`),
  );
  const seen = new Set(candidates.slice(0, 8).map((book) => book.id));
  const selected = selectHomeShelfBooks(candidates, seen, 10);

  assert.equal(selected.length, 10);
  assert.equal(new Set(selected.map((book) => book.id)).size, 10);
  assert.ok(selected.every((book) => candidates.includes(book)));
});

