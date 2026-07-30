import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeVietnameseSearchText,
  rankCatalogSearchCandidates,
  sortRankedCatalogSearch,
} from "../lib/catalog-search";

const books = [
  {
    id: "B001",
    title: "Đắc Nhân Tâm",
    authorName: "Dale Carnegie",
    categoryName: "Kỹ năng sống",
    publisher: "Nhà xuất bản Tổng hợp",
    isbn: "978-604-00-0001-1",
    price: 120_000,
    rating: 4.8,
    publishYear: 2018,
  },
  {
    id: "B002",
    title: "Nhà Giả Kim",
    authorName: "Paulo Coelho",
    categoryName: "Văn học nước ngoài",
    publisher: "Nhã Nam",
    isbn: "978-604-00-0002-8",
    price: 95_000,
    rating: 4.5,
    publishYear: 2020,
  },
  {
    id: "B003",
    title: "Kỹ năng giao tiếp",
    authorName: "Nguyễn Minh",
    categoryName: "Kỹ năng sống",
    publisher: "Nhà xuất bản Trẻ",
    isbn: null,
    price: 80_000,
    rating: 4.2,
    publishYear: 2024,
  },
];

test("chuẩn hóa tiếng Việt, chữ đ và khoảng trắng", () => {
  assert.equal(normalizeVietnameseSearchText("  ĐẮC   Nhân-Tâm! "), "dac nhan tam");
});

test("tìm không dấu vẫn khớp tiêu đề tiếng Việt có dấu", () => {
  const result = rankCatalogSearchCandidates(books, "dac nhan tam");
  assert.equal(result[0]?.id, "B001");
  assert.equal(result[0]?.matchedBy, "TITLE");
});

test("chịu một lỗi gõ ở từ đủ dài", () => {
  const result = rankCatalogSearchCandidates(books, "carnegiee");
  assert.equal(result[0]?.id, "B001");
  assert.equal(result[0]?.matchedBy, "AUTHOR");
});

test("ưu tiên tiêu đề hơn thể loại khi cùng khớp", () => {
  const result = rankCatalogSearchCandidates(books, "ky nang");
  assert.equal(result[0]?.id, "B003");
  assert.equal(result[0]?.matchedBy, "TITLE");
});

test("tìm chính xác theo ISBN đã bỏ dấu phân cách", () => {
  const result = rankCatalogSearchCandidates(books, "9786040000028");
  assert.equal(result[0]?.id, "B002");
  assert.equal(result[0]?.matchedBy, "ISBN");
});

test("không trả kết quả khi ý định nhiều từ khớp quá ít", () => {
  const result = rankCatalogSearchCandidates(books, "lap trinh python");
  assert.deepEqual(result, []);
});

test("sắp xếp kết quả tìm kiếm nhưng vẫn giữ tie-break deterministic", () => {
  const ranked = rankCatalogSearchCandidates(books, "ky nang");
  assert.deepEqual(
    sortRankedCatalogSearch(ranked, books, "price-low").map((item) => item.id),
    ["B003", "B001"],
  );
  assert.deepEqual(
    sortRankedCatalogSearch(ranked, books, "newest").map((item) => item.id),
    ["B003", "B001"],
  );
});
