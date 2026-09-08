import assert from "node:assert/strict";
import test from "node:test";

import {
  BOOKVERSE_ORIGINAL_V2_CHAPTER_OFFSET,
  selectPreferredBookChunks,
  usesBookVerseOriginalV2,
} from "../lib/book-content-version";

function originalV2Chunks(count = 32) {
  return Array.from({ length: count }, (_, index) => ({
    id: `BV-ORIGINAL-V2-B0001-${String(index).padStart(3, "0")}`,
    chapterNumber:
      BOOKVERSE_ORIGINAL_V2_CHAPTER_OFFSET + Math.floor(index / 4) + 1,
    chunkIndex: index % 4,
    pageNumber: index + 1,
    content: `Trang mới ${index + 1}`,
  }));
}

const legacyChunks = Array.from({ length: 13 }, (_, index) => ({
  id: `BV-MEMBER-CHUNK-B0001-${String(index).padStart(3, "0")}`,
  chapterNumber: 1,
  chunkIndex: index,
  pageNumber: index + 1,
  content: `Đoạn cũ ${index + 1}`,
}));

test("ưu tiên trọn bộ nội dung BookVerse v2 và chuẩn hóa lại số chương", () => {
  const selected = selectPreferredBookChunks([
    ...legacyChunks,
    ...originalV2Chunks(),
  ]);

  assert.equal(selected.length, 32);
  assert.equal(selected[0]?.chapterNumber, 1);
  assert.equal(selected.at(-1)?.chapterNumber, 8);
  assert.equal(usesBookVerseOriginalV2(selected), true);
});

test("seed v2 dở dang phải quay về nội dung cũ", () => {
  const selected = selectPreferredBookChunks([
    ...legacyChunks,
    ...originalV2Chunks(7),
  ]);

  assert.deepEqual(selected, legacyChunks);
  assert.equal(usesBookVerseOriginalV2(selected), false);
});
