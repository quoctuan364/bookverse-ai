import assert from "node:assert/strict";
import test from "node:test";

import { getCatalogHeroDescription } from "@/lib/catalog-presentation";

test("Catalog dùng tổng số sách thật thay vì tuyên bố hàng nghìn đầu sách", () => {
  const description = getCatalogHeroDescription(20);
  assert.match(description, /20 đầu sách/);
  assert.doesNotMatch(description, /hàng nghìn/i);
});

test("tổng Catalog lỗi không tạo NaN hoặc số âm", () => {
  assert.match(getCatalogHeroDescription(Number.NaN), /0 đầu sách/);
  assert.match(getCatalogHeroDescription(-10), /0 đầu sách/);
});
