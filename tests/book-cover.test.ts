import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { BookCover } from "@/components/shared/BookCover";
import {
  bookCoverLoadReducer,
  classifyBookCoverSource,
  createBookCoverLoadState,
  getDemoCoverArt,
  getDemoCoverLayout,
  getRealCatalogLocalCoverPath,
  getInitialCoverStatus,
  isLegacySyntheticCover,
  isUsableBookCoverDimensions,
  normalizeBookCoverUrl,
  sanitizeFallbackAuthor,
  sanitizeFallbackTitle,
} from "@/lib/book-cover";

test("cover null hoặc rỗng dùng trạng thái EMPTY", () => {
  assert.equal(classifyBookCoverSource(null), "EMPTY");
  assert.equal(normalizeBookCoverUrl("   "), null);
});

test("cover local được chuẩn hóa về public path tuyệt đối", () => {
  assert.equal(normalizeBookCoverUrl("covers/flat/book.svg"), "/covers/flat/book.svg");
  assert.equal(normalizeBookCoverUrl("\\covers\\flat\\book.svg"), "/covers/flat/book.svg");
});

test("cover remote chỉ nhận HTTP hoặc HTTPS hợp lệ", () => {
  assert.equal(classifyBookCoverSource("https://example.com/book.jpg"), "REMOTE");
  assert.equal(normalizeBookCoverUrl("http://example.com/book.jpg"), "http://example.com/book.jpg");
  assert.equal(normalizeBookCoverUrl("javascript:alert(1)"), null);
  assert.equal(normalizeBookCoverUrl("file:///tmp/book.jpg"), null);
});

test("cover local từ chối path traversal và Windows absolute path", () => {
  assert.equal(normalizeBookCoverUrl("../secret.jpg"), null);
  assert.equal(normalizeBookCoverUrl("C:\\covers\\book.jpg"), null);
  assert.equal(normalizeBookCoverUrl("//other-host/book.jpg"), null);
});

test("trạng thái null và malformed được phân loại rõ", () => {
  assert.equal(getInitialCoverStatus(null), "MISSING");
  assert.equal(getInitialCoverStatus("javascript:alert(1)"), "MALFORMED");
});

test("bìa synthetic cũ và Picsum không được dùng như bìa thật", () => {
  assert.equal(isLegacySyntheticCover("/covers/flat/book-0668.svg"), true);
  assert.equal(isLegacySyntheticCover("/covers/B001.png"), true);
  assert.equal(isLegacySyntheticCover("https://picsum.photos/320/480"), true);
  assert.equal(isLegacySyntheticCover("https://publisher.example/cover.webp"), false);
});

test("ảnh chỉ được dùng làm bìa khi kích thước và tỷ lệ hợp lệ", () => {
  assert.equal(isUsableBookCoverDimensions(320, 480), true);
  assert.equal(isUsableBookCoverDimensions(500, 500), false);
  assert.equal(isUsableBookCoverDimensions(500, 346), false);
  assert.equal(isUsableBookCoverDimensions(79, 480), false);
  assert.equal(isUsableBookCoverDimensions(320, 119), false);
});

test("fallback deterministic theo bookId", () => {
  const firstArt = getDemoCoverArt({ bookId: "B0668", title: "Sổ tay AI #0668" });
  const firstLayout = getDemoCoverLayout("B0668");
  assert.equal(getDemoCoverArt({ bookId: "B0668", title: "Sổ tay AI #0668" }), firstArt);
  assert.equal(
    getDemoCoverArt({ bookId: "B0668", title: "Tiêu đề khác", category: "Kinh doanh" }),
    firstArt,
  );
  assert.equal(getDemoCoverLayout("B0668"), firstLayout);
  assert.ok(firstLayout >= 0 && firstLayout < 6);
});

test("fallback loại mã synthetic nhưng không sửa dữ liệu gốc", () => {
  const sourceTitle = "Thiết kế sản phẩm số thực chiến #0668";
  const sourceAuthor = "Nguyễn Minh An 0668";
  assert.equal(sanitizeFallbackTitle(sourceTitle), "Thiết kế sản phẩm số thực chiến");
  assert.equal(sanitizeFallbackAuthor(sourceAuthor), "Nguyễn Minh An");
  assert.equal(sourceTitle, "Thiết kế sản phẩm số thực chiến #0668");
  assert.equal(
    sanitizeFallbackAuthor("Nguyễn Minh An 0668, Lê Gia Uyên 1682, Phạm Hà"),
    "Nguyễn Minh An, Lê Gia Uyên, Phạm Hà",
  );
});

test("local cover chỉ thành LOCAL_VALID sau sự kiện load", () => {
  const initial = createBookCoverLoadState("/covers/demo-art-v2/technology.webp");
  assert.equal(initial.status, "NOT_VERIFIED");
  const loaded = bookCoverLoadReducer(initial, { type: "SOURCE_LOADED" });
  assert.equal(loaded.status, "LOCAL_VALID");
  assert.equal(loaded.showFallback, false);
});

test("catalog thật ưu tiên local và chỉ thử remote một lần khi local lỗi", () => {
  assert.equal(getRealCatalogLocalCoverPath("RB00001"), "/covers/real-catalog-local/RB00001.jpg");
  assert.equal(getRealCatalogLocalCoverPath("B00001"), null);
  const localFirst = createBookCoverLoadState(
    "https://covers.openlibrary.org/b/id/123-L.jpg",
    "/covers/real-catalog-local/RB00001.jpg",
  );
  assert.equal(localFirst.normalizedSource, "/covers/real-catalog-local/RB00001.jpg");
  const remote = bookCoverLoadReducer(localFirst, { type: "SOURCE_FAILED", reason: "HTTP_404" });
  assert.equal(remote.normalizedSource, "https://covers.openlibrary.org/b/id/123-L.jpg");
  assert.equal(remote.showFallback, false);
  const fallback = bookCoverLoadReducer(remote, { type: "SOURCE_FAILED", reason: "TIMEOUT" });
  assert.equal(fallback.showFallback, true);
  assert.equal(bookCoverLoadReducer(fallback, { type: "SOURCE_FAILED", reason: "ERROR" }), fallback);
});

test("remote chỉ thành REAL_VALID khi manifest giấy phép đã phê duyệt", () => {
  const initial = createBookCoverLoadState("https://publisher.example/cover.webp");
  assert.equal(bookCoverLoadReducer(initial, { type: "SOURCE_LOADED" }).status, "NOT_VERIFIED");
  assert.equal(
    bookCoverLoadReducer(initial, { type: "SOURCE_LOADED", approvedReal: true }).status,
    "REAL_VALID",
  );
});

test("HTTP 404 và timeout chuyển sang fallback", () => {
  const source = createBookCoverLoadState("https://example.com/not-found.jpg");
  const notFound = bookCoverLoadReducer(source, { type: "SOURCE_FAILED", reason: "HTTP_404" });
  assert.equal(notFound.status, "HTTP_404");
  assert.equal(notFound.showFallback, true);

  const timeout = bookCoverLoadReducer(source, { type: "SOURCE_FAILED", reason: "TIMEOUT" });
  assert.equal(timeout.status, "LOAD_FAILED");
  assert.equal(timeout.showFallback, true);
});

test("sau khi fallback, reducer không retry hoặc đổi trạng thái", () => {
  const failed = bookCoverLoadReducer(createBookCoverLoadState("https://example.com/404.jpg"), {
    type: "SOURCE_FAILED",
    reason: "ERROR",
  });
  assert.strictEqual(bookCoverLoadReducer(failed, { type: "SOURCE_LOADED" }), failed);
  assert.strictEqual(
    bookCoverLoadReducer(failed, { type: "SOURCE_FAILED", reason: "TIMEOUT" }),
    failed,
  );
});

test("tiêu đề dài dùng tối đa ba dòng và fallback không chứa mã/giá/edition", () => {
  const html = renderToStaticMarkup(
    createElement(BookCover, {
      author: "Tác giả Demo 0668",
      bookId: "B0668",
      src: null,
      title: "Một tiêu đề rất dài để kiểm tra cách xuống dòng của bìa sách #0668",
    }),
  );
  assert.match(html, /line-clamp-3/);
  assert.doesNotMatch(html, /#0668|EBOOK EDITION|₫|VND/);
  assert.match(html, /BookVerse Demo/);
});
