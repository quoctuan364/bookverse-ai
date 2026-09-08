import test from "node:test";
import assert from "node:assert/strict";
import { decideReadingAccess } from "../lib/reading-access-policy";
import { rankReaderRagChunks, type ReaderRagChunk } from "../lib/reader-rag";

test("Reader RAG Security: Người dùng PREVIEW chỉ được truy vấn trong phạm vi 10% chunks", () => {
  // Giả lập một cuốn sách có 20 chunks (Chương 1 có 5 chunks, chiếm 25% sách)
  const allBookChunks: ReaderRagChunk[] = Array.from({ length: 20 }, (_, index) => ({
    id: `chunk-${index + 1}`,
    chapterNumber: index < 5 ? 1 : 2,
    chapterTitle: index < 5 ? "Chương 1: Mở đầu" : "Chương 2: Nội dung chính",
    pageNumber: index + 1,
    chunkIndex: index,
    content:
      index === 4
        ? "Đây là bí mật ở chunk 5 của chương 1 (thuộc 25% sách, vượt quá 10%)."
        : `Nội dung phần ${index + 1} của cuốn sách về kiến thức.`,
  }));

  // 1. Kiểm tra đối với người dùng CHƯA CÓ QUYỀN (PREVIEW)
  const previewAccess = decideReadingAccess({
    totalPages: allBookChunks.length,
    hasEntitlement: false,
  });

  // 10% của 20 chunks = 2 chunks
  assert.equal(previewAccess.visiblePages, 2);
  assert.equal(previewAccess.access, "PREVIEW");

  const availableChunksPreview = allBookChunks.slice(0, previewAccess.visiblePages);
  assert.equal(availableChunksPreview.length, 2);

  // Thử hỏi câu hỏi nhắm vào chunk 5 (vốn nằm ngoài phạm vi 10%)
  const retrievedChunksPreview = rankReaderRagChunks(
    availableChunksPreview,
    "bí mật ở chunk 5",
    1,
    5
  );

  // RAG không được phép tìm thấy chunk 5 vì đã bị cắt server-side
  const foundSecretInPreview = retrievedChunksPreview.some((c) =>
    c.content.includes("bí mật ở chunk 5")
  );
  assert.equal(foundSecretInPreview, false);

  // 2. Kiểm tra đối với người dùng ĐÃ CÓ QUYỀN (FULL)
  const fullAccess = decideReadingAccess({
    totalPages: allBookChunks.length,
    hasEntitlement: true,
  });

  assert.equal(fullAccess.visiblePages, 20);
  assert.equal(fullAccess.access, "FULL");

  const availableChunksFull = allBookChunks.slice(0, fullAccess.visiblePages);
  assert.equal(availableChunksFull.length, 20);

  const retrievedChunksFull = rankReaderRagChunks(
    availableChunksFull,
    "bí mật ở chunk 5",
    1,
    5
  );

  // Người dùng FULL tìm thấy chính xác chunk 5
  const foundSecretInFull = retrievedChunksFull.some((c) =>
    c.content.includes("bí mật ở chunk 5")
  );
  assert.equal(foundSecretInFull, true);
});
