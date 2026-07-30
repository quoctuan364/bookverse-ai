import assert from "node:assert/strict";
import test from "node:test";

import {
  areReaderRagCitationsGrounded,
  buildLocalGroundedReaderAnswer,
  parseReaderRagCitations,
  rankReaderRagChunks,
  READER_RAG_NOT_FOUND,
  type ReaderRagChunk,
} from "../lib/reader-rag";

const chunks: ReaderRagChunk[] = [
  {
    chapterNumber: 1,
    chapterTitle: "Hệ sinh thái quanh ta",
    pageNumber: 1,
    chunkIndex: 0,
    content: "Hệ sinh thái là một mạng lưới sinh vật và điều kiện sống liên kết với nhau.",
  },
  {
    chapterNumber: 2,
    chapterTitle: "Dòng năng lượng",
    pageNumber: 5,
    chunkIndex: 0,
    content: "Năng lượng đi qua sinh vật sản xuất, tiêu thụ và phân giải.",
  },
];

test("retrieval chỉ xếp hạng chunk có từ khóa liên quan", () => {
  const result = rankReaderRagChunks(chunks, "Dòng năng lượng đi qua đâu?", 1);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.chapterNumber, 2);
});

test("câu hỏi ngoài nội dung không trả chunk để tránh bịa", () => {
  assert.deepEqual(rankReaderRagChunks(chunks, "Thủ đô của Pháp là gì?", 1), []);
  assert.equal(buildLocalGroundedReaderAnswer("không liên quan", []), READER_RAG_NOT_FOUND);
});

test("local grounded answer luôn có citation thuộc chunk", () => {
  const answer = buildLocalGroundedReaderAnswer("Giải thích hệ sinh thái", [chunks[0]]);
  assert.match(answer, /\[Chương 1, Trang 1\]/u);
  assert.equal(areReaderRagCitationsGrounded(answer, [chunks[0]]), true);
});

test("hậu kiểm từ chối citation bịa hoặc câu trả lời không citation", () => {
  assert.equal(areReaderRagCitationsGrounded("Câu trả lời không nguồn.", chunks), false);
  assert.equal(
    areReaderRagCitationsGrounded("Thông tin bịa. [Chương 9, Trang 99]", chunks),
    false,
  );
  assert.equal(areReaderRagCitationsGrounded(READER_RAG_NOT_FOUND, chunks), true);
});

test("parser đọc được citation có và không có số trang", () => {
  assert.deepEqual(
    parseReaderRagCitations("[Chương 1, Trang 1] và [Chương 2]"),
    [
      { chapterNumber: 1, pageNumber: 1 },
      { chapterNumber: 2, pageNumber: null },
    ],
  );
});
