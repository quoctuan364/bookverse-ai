import assert from "node:assert/strict";
import test from "node:test";

import {
  catalogBookQualityWhere,
  publicBookQualityWhere,
  publicDemoBookWhere,
} from "@/lib/public-book-policy";

test("catalog ưu tiên sách thật khi pipeline public đã sẵn sàng", () => {
  assert.deepEqual(catalogBookQualityWhere(true), publicBookQualityWhere());
});

test("catalog dùng dữ liệu demo có bìa khi catalog thật chưa được import", () => {
  const fallback = catalogBookQualityWhere(false);
  assert.deepEqual(fallback, publicDemoBookWhere());
  assert.deepEqual(fallback.id, { startsWith: "B" });
  assert.deepEqual(fallback.coverPath, { not: null });
  assert.equal(fallback.isPubliclyVisible, true);
});
