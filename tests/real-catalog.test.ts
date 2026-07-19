import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  loadAndValidateCategoryMapping,
  loadAndValidateRealCatalog,
  resolveSourceIdentity,
  validateRealCatalog,
  validateOpenLibraryCoverUrl,
  validateOpenLibraryPageUrl,
} from "@/lib/real-catalog";

const sourcePath = path.resolve(process.cwd(), "data", "real-catalog", "bookverse_real_catalog.json");
const mappingPath = path.resolve(process.cwd(), "config", "real-catalog-category-mapping.json");

test("catalog 3.046 record giữ đúng nhãn và báo riêng hai edition-only", () => {
  const result = loadAndValidateRealCatalog(sourcePath);
  assert.ok(result.catalog);
  assert.equal(result.summary.status, "PARTIAL");
  assert.equal(result.summary.books, 3_046);
  assert.equal(result.summary.authors, 3_260);
  assert.equal(result.summary.categories, 39);
  assert.equal(result.summary.uniqueWorkRecords, 3_044);
  assert.equal(result.summary.editionOnlyRecords, 2);
  assert.equal(result.summary.uniqueSourceRecords, 3_046);
  assert.equal(result.summary.uniqueCoverIds, 3_046);
  assert.equal(result.summary.uniqueCoverUrls, 3_046);
  assert.equal(result.summary.uniqueIsbn, 2_343);
  assert.equal(result.summary.vietnameseEditions, 259);
  assert.equal(result.summary.missingLanguage, 34);
  assert.equal(result.summary.orphanBookAuthor, 0);
  assert.equal(result.summary.orphanBookCategory, 0);
});

test("mapping review khớp checksum và xử lý đủ 39 category", () => {
  const result = loadAndValidateRealCatalog(sourcePath);
  assert.ok(result.catalog);
  const mapping = loadAndValidateCategoryMapping(
    mappingPath,
    result.catalog,
    result.summary.catalogChecksum,
  );
  assert.ok(mapping.mapping);
  assert.equal(mapping.issues.length, 0);
  assert.equal(mapping.mapping.entries.length, 39);
});

test("cover và source URL fail-closed ngoài allowlist", () => {
  assert.equal(validateOpenLibraryCoverUrl("https://covers.openlibrary.org/b/id/123-L.jpg?default=false"), true);
  assert.equal(validateOpenLibraryCoverUrl("https://evil.example/b/id/123-L.jpg?default=false"), false);
  assert.equal(validateOpenLibraryCoverUrl("javascript:alert(1)"), false);
  assert.equal(validateOpenLibraryPageUrl("https://openlibrary.org/works/OL123W"), true);
  assert.equal(validateOpenLibraryPageUrl("https://openlibrary.org/books/OL123M"), true);
  assert.equal(validateOpenLibraryPageUrl("file:///tmp/book.json"), false);
});

test("edition-only không bị giả thành Open Library work", () => {
  assert.deepEqual(
    resolveSourceIdentity({
      openLibraryWorkKey: "/works/OL8461625M",
      openLibraryEditionKey: "/books/OL8461625M",
    }),
    {
      sourceRecordKey: "/books/OL8461625M",
      sourceRecordType: "EDITION_ONLY",
      sourceWorkKey: null,
      sourceWorkKeyRaw: "/works/OL8461625M",
      sourceEditionKey: "/books/OL8461625M",
    },
  );
});

test("validator fail khi edition-only bị đổi thành work giả", () => {
  const loaded = loadAndValidateRealCatalog(sourcePath);
  assert.ok(loaded.catalog);
  const mutated = structuredClone(loaded.catalog);
  const editionOnly = mutated.books.find((book) => book.id === "RB00583");
  assert.ok(editionOnly);
  editionOnly.openLibraryWorkKey = "/works/OL8461625W";
  editionOnly.openLibraryWorkUrl = "https://openlibrary.org/works/OL8461625W";
  const result = validateRealCatalog(mutated, Buffer.from(JSON.stringify(mutated)));
  assert.equal(result.catalog, null);
  assert.ok(result.summary.issues.some((issue) => issue.code === "WORK_COUNT_INVARIANT_FAILED"));
  assert.ok(result.summary.issues.some((issue) => issue.code === "EDITION_ONLY_COUNT_INVARIANT_FAILED"));
});

test("validator fail khi work malformed hoặc source record bị trùng", () => {
  const loaded = loadAndValidateRealCatalog(sourcePath);
  assert.ok(loaded.catalog);
  const malformed = structuredClone(loaded.catalog);
  malformed.books[0].openLibraryWorkKey = "/works/OL123X";
  malformed.books[0].openLibraryWorkUrl = "https://openlibrary.org/works/OL123X";
  const malformedResult = validateRealCatalog(malformed, Buffer.from(JSON.stringify(malformed)));
  assert.equal(malformedResult.catalog, null);
  assert.ok(malformedResult.summary.issues.some((issue) => issue.code === "INVALID_SOURCE_IDENTITY"));

  const duplicate = structuredClone(loaded.catalog);
  duplicate.books[1].openLibraryWorkKey = duplicate.books[0].openLibraryWorkKey;
  duplicate.books[1].openLibraryWorkUrl = duplicate.books[0].openLibraryWorkUrl;
  const duplicateResult = validateRealCatalog(duplicate, Buffer.from(JSON.stringify(duplicate)));
  assert.equal(duplicateResult.catalog, null);
  assert.ok(duplicateResult.summary.issues.some((issue) => issue.code === "DUPLICATE_INVARIANT"));
});

test("validator fail khi số source record thay đổi ngoài acceptance criterion", () => {
  const loaded = loadAndValidateRealCatalog(sourcePath);
  assert.ok(loaded.catalog);
  const mutated = structuredClone(loaded.catalog);
  const removed = mutated.books.pop();
  assert.ok(removed);
  mutated.bookAuthors = mutated.bookAuthors.filter((row) => row.bookId !== removed.id);
  mutated.bookCategories = mutated.bookCategories.filter((row) => row.bookId !== removed.id);
  const result = validateRealCatalog(mutated, Buffer.from(JSON.stringify(mutated)));
  assert.equal(result.catalog, null);
  assert.ok(result.summary.issues.some((issue) => issue.code === "WRONG_BOOK_COUNT"));
  assert.ok(result.summary.issues.some((issue) => issue.code === "WORK_COUNT_INVARIANT_FAILED"));
});
