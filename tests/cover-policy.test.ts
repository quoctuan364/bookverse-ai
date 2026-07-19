import assert from "node:assert/strict";
import test from "node:test";

import { classifyCoverDimension, COVER_POLICY, isAllowedCoverSourceUrl, isAllowedFinalCoverUrl, isUsableCoverDimensions } from "@/lib/cover-policy";

test("cover policy dùng cùng allowlist Open Library và fail-closed redirect", () => {
  assert.equal(isAllowedCoverSourceUrl("https://covers.openlibrary.org/b/id/123-L.jpg?default=false"), true);
  assert.equal(isAllowedCoverSourceUrl("https://archive.org/download/x/cover.jpg"), false);
  assert.equal(isAllowedFinalCoverUrl("https://archive.org/download/x/cover.jpg"), true);
  assert.equal(isAllowedFinalCoverUrl("https://example.com/x/cover.jpg"), false);
  assert.deepEqual(COVER_POLICY.followedStorageRedirectAllowlist, ["archive.org"]);
});

test("dimension policy phân biệt cover không chuẩn, quá nhỏ và landscape", () => {
  assert.equal(isUsableCoverDimensions(320, 480), true);
  assert.equal(isUsableCoverDimensions(500, 700), true);
  assert.equal(isUsableCoverDimensions(500, 500), false);
  assert.equal(classifyCoverDimension({ width: 500, height: 700, bytes: 20_000, status: "HTTP_VERIFIED" }), "VALID_NON_STANDARD_BOOK_RATIO");
  assert.equal(classifyCoverDimension({ width: 500, height: 500, bytes: 20_000, status: "INVALID_DIMENSION" }), "LANDSCAPE_INVALID");
  assert.equal(classifyCoverDimension({ width: 35, height: 53, bytes: 1_527, status: "INVALID_DIMENSION" }), "TOO_SMALL");
});
