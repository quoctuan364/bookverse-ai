import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  calculateGoldQualityScore,
  deriveGoldQualityTier,
  hardRejectReasons,
  isValidIsbn10,
  isValidIsbn13,
  normalizeIsbn,
  stableStringify,
} from "@/lib/gold-catalog";

test("ISBN được chuẩn hoá và kiểm tra checksum", () => {
  assert.equal(normalizeIsbn("0-306-40615-2"), "0306406152");
  assert.equal(isValidIsbn10("0306406152"), true);
  assert.equal(isValidIsbn10("0306406153"), false);
  assert.equal(isValidIsbn13("9780306406157"), true);
  assert.equal(isValidIsbn13("9780306406158"), false);
});

test("điểm chất lượng deterministic và tier fail-closed", () => {
  const input = {
    title: "A verified book",
    authors: ["A. Author"],
    providerBookId: "OL123M",
    isbn10: "0306406152",
    isbn13: null,
    description: "A sufficiently long description that is present in the provider response and can be audited.",
    publisher: "Publisher",
    publishedDate: null,
    publishedYear: 2020,
    language: "eng",
    pageCount: 200,
    canonicalCategoryKeys: ["literature"],
    coverTechnicalStatus: "TECHNICALLY_VERIFIED" as const,
    sourceUrl: "https://openlibrary.org/books/OL123M",
    rawChecksum: "raw",
    normalizedChecksum: "normalized",
  };
  assert.equal(calculateGoldQualityScore(input), 95);
  assert.equal(deriveGoldQualityTier(95, "TECHNICALLY_VERIFIED", []), "FEATURED");
  assert.equal(deriveGoldQualityTier(90, "TECHNICALLY_INVALID", []), "GOLD");
  assert.equal(deriveGoldQualityTier(95, "TECHNICALLY_VERIFIED", ["COVER_TECHNICALLY_INVALID"]), "REJECTED");
});

test("hard reject không cho qua metadata synthetic hoặc thiếu provenance", () => {
  const reasons = hardRejectReasons({
    title: "Book #1234",
    authors: [],
    providerBookId: null,
    sourceUrl: null,
    isbn10: "0306406153",
    isbn13: null,
    coverTechnicalStatus: "TECHNICALLY_INVALID",
  });
  assert.deepEqual(reasons, [
    "EMPTY_AUTHOR",
    "SYNTHETIC_TITLE_PATTERN",
    "MISSING_STABLE_PROVIDER_ID",
    "MISSING_SOURCE_URL",
    "INVALID_ISBN_CHECKSUM",
    "COVER_TECHNICALLY_INVALID",
  ]);
});

test("stableStringify sắp xếp key để checksum tái lập", () => {
  assert.equal(stableStringify({ b: 2, a: 1 }), '{"a":1,"b":2}');
});

test("mapping LOW giữ NEEDS_REVIEW và có lý do/evidence", () => {
  const root = process.cwd();
  const source = JSON.parse(fs.readFileSync(path.join(root, "config", "real-catalog-category-mapping.json"), "utf8")) as { entries: Array<{ sourceSlug: string; confidence: string; rationale: string }> };
  const generated = JSON.parse(fs.readFileSync(path.join(root, "data", "gold-catalog-v1", "manifests", "category-mapping-v1.json"), "utf8")) as { entries: Array<{ sourceSlug: string; confidence: string; reviewerStatus: string }> };
  const lowSource = source.entries.filter((entry) => entry.confidence === "LOW");
  const lowGenerated = generated.entries.filter((entry) => entry.confidence === "LOW");
  assert.equal(lowSource.length, 8);
  assert.equal(lowGenerated.length, lowSource.length);
  assert.ok(lowSource.every((entry) => entry.rationale.trim().length > 0));
  assert.ok(lowGenerated.every((entry) => entry.reviewerStatus === "NEEDS_REVIEW"));
});
