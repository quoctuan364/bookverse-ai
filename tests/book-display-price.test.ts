import assert from "node:assert/strict";
import test from "node:test";

import {
  formatBookPrice,
  getBookDisplayPrice,
  normalizeBookPrice,
} from "@/lib/book-display-price";

test("B016 phân biệt giá catalog và giá listing sách cũ", () => {
  const price = getBookDisplayPrice({ bookPrice: 269_000, listingPrice: 231_000 });

  assert.deepEqual(price, {
    catalogPrice: 269_000,
    listingPrice: 231_000,
    purchasePrice: 231_000,
    hasPromotion: false,
  });
  assert.match(formatBookPrice(price.catalogPrice), /269[.\s]000/);
  assert.match(formatBookPrice(price.purchasePrice), /231[.\s]000/);
});

test("sách không có listing dùng giá catalog", () => {
  assert.deepEqual(getBookDisplayPrice({ bookPrice: "125000" }), {
    catalogPrice: 125_000,
    listingPrice: null,
    purchasePrice: 125_000,
    hasPromotion: false,
  });
});

test("giá 0 hợp lệ; NaN và số âm không lọt ra giao diện", () => {
  assert.equal(normalizeBookPrice(0), 0);
  assert.equal(normalizeBookPrice(Number.NaN), 0);
  assert.equal(normalizeBookPrice(-1), 0);
  assert.doesNotMatch(formatBookPrice(Number.NaN), /NaN/);
});
