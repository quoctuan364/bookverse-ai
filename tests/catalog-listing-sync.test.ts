import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCatalogListingDescription,
  catalogListingId,
  catalogPaperEditionId,
  normalizeCatalogListingPrice,
  stableCatalogStock,
} from "@/lib/catalog-listing-sync";

test("listing catalog dùng ID cố định theo bookId và từ chối mã sai", () => {
  assert.equal(catalogListingId("RB00339"), "BV-CATALOG-RB00339");
  assert.equal(catalogPaperEditionId("RB00339"), "BV-EDITION-PAPER-NEW-RB00339");
  assert.throws(() => catalogListingId("B00339"), /không hợp lệ/u);
});

test("giá catalog hợp lệ, làm tròn và bị giới hạn an toàn", () => {
  assert.equal(normalizeCatalogListingPrice(123_456), 123_000);
  assert.equal(normalizeCatalogListingPrice(10_000), 69_000);
  assert.equal(normalizeCatalogListingPrice(900_000), 499_000);
  assert.equal(normalizeCatalogListingPrice(Number.NaN), 149_000);
});

test("tồn kho catalog luôn dương và ổn định theo mã sách", () => {
  const first = stableCatalogStock("RB00339");
  assert.equal(first, stableCatalogStock("RB00339"));
  assert.ok(first >= 5 && first <= 20);
});

test("mô tả listing dùng metadata BookVerse, không sao chép mô tả nguồn", () => {
  const description = buildCatalogListingDescription("Tên sách", "Tác giả");
  assert.match(description, /Tên sách của Tác giả/u);
  assert.match(description, /đúng bìa/u);
});
