import assert from "node:assert/strict";
import test from "node:test";

import {
  resolvePublishedYear,
  resolveRatingAverage,
  validateDataset,
} from "@/lib/dataset-validation";

function validDataset() {
  return {
    categories: [{ id: 1, parent_id: null }],
    tags: [{ id: 1 }],
    authors: [{ id: 1 }],
    books: [
      {
        id: 1,
        title: "Sách kiểm thử",
        description: "Mô tả hợp lệ",
        language: "vi",
        category_id: 1,
        cover_url: "/covers/book.svg",
        published_year: 2020,
        rating_avg: 4.5,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-02T00:00:00Z",
      },
    ],
    book_authors: [{ book_id: 1, author_id: 1 }],
    book_tags: [{ book_id: 1, tag_id: 1 }],
    ebooks: [
      {
        id: 1,
        book_id: 1,
        file_format: "HTML_JSON",
        html_url: "/ebooks/book.html",
        json_url: "/ebooks/book.json",
        created_at: "2025-01-01T00:00:00Z",
      },
    ],
    book_files: [{ id: 1, ebook_id: 1, file_url: "/ebooks/book.html", checksum: "abc" }],
    listings: [{ id: 1, book_id: 1, title: "Tin bán", description: "Mô tả tin bán" }],
    users: [],
    profiles: [],
    user_interests: [],
    orders: [],
    order_items: [],
    reviews: [],
    reading_progress: [],
    reading_sessions: [],
    bookmarks: [],
    highlights: [],
    community_posts: [],
    comments: [],
    reactions: [],
    reports: [],
    interaction_events: [],
    daily_recommendations: [],
    recommendation_evidence: [],
  };
}

test("mapping ưu tiên published_year và rating_avg", () => {
  assert.deepEqual(
    resolvePublishedYear({ published_year: 2020, publication_year: 1999 }),
    { value: 2020, sourceField: "published_year", valid: true },
  );
  assert.deepEqual(
    resolveRatingAverage({ rating_avg: 4.2, rating_average: 1.2 }),
    { value: 4.2, sourceField: "rating_avg", valid: true },
  );
});

test("mapping fallback sang field legacy", () => {
  assert.deepEqual(resolvePublishedYear({ publication_year: "2018" }), {
    value: 2018,
    sourceField: "publication_year",
    valid: true,
  });
  assert.deepEqual(resolveRatingAverage({ rating_average: "3.5" }), {
    value: 3.5,
    sourceField: "rating_average",
    valid: true,
  });
});

test("mapping giữ nguyên giá trị 0 và báo lỗi đúng khi sai kiểu", () => {
  assert.deepEqual(resolveRatingAverage({ rating_avg: 0, rating_average: 4 }), {
    value: 0,
    sourceField: "rating_avg",
    valid: true,
  });
  assert.equal(resolvePublishedYear({ published_year: "không-phải-số" }).valid, false);
  assert.equal(resolveRatingAverage({ rating_avg: {} }).valid, false);
});

test("record hợp lệ", () => {
  const result = validateDataset(validDataset());
  assert.equal(result.valid, 1);
  assert.equal(result.invalid, 0);
  assert.equal(result.failedRelations, 0);
});

test("thiếu title tạo INVALID", () => {
  const dataset = validDataset();
  dataset.books[0].title = "";
  const result = validateDataset(dataset);
  assert.equal(result.invalid, 1);
  assert.ok(result.issues.some((item) => item.code === "REQUIRED_STRING"));
});

test("ID trùng tạo SKIPPED_DUPLICATE", () => {
  const dataset = validDataset();
  dataset.books.push({ ...dataset.books[0] });
  const result = validateDataset(dataset);
  assert.equal(result.duplicates, 1);
});

test("rating và năm ngoài miền không bị clamp", () => {
  const dataset = validDataset();
  dataset.books[0].rating_avg = 6;
  dataset.books[0].published_year = 800;
  const result = validateDataset(dataset);
  assert.equal(result.invalid, 1);
  assert.ok(result.issues.some((item) => item.code === "INVALID_RATING"));
  assert.ok(result.issues.some((item) => item.code === "INVALID_PUBLISHED_YEAR"));
});

test("relation thiếu tạo FAILED_RELATION", () => {
  const dataset = validDataset();
  dataset.book_authors = [];
  const result = validateDataset(dataset);
  assert.equal(result.failedRelations, 1);
  assert.ok(result.issues.some((item) => item.code === "MISSING_AUTHOR_RELATION"));
});
