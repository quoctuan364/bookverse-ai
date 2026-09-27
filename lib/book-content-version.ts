export const BOOKVERSE_ORIGINAL_V2_PREFIX = "BV-ORIGINAL-V2-";
export const BOOKVERSE_ORIGINAL_V2_CHAPTER_OFFSET = 100;
export const BOOKVERSE_ORIGINAL_V2_PAGE_COUNT = 32;

export interface VersionedBookChunk {
  id: string;
  chapterNumber: number;
  chunkIndex: number;
  pageNumber: number | null;
}

export function isBookVerseOriginalV2Chunk(
  chunk: Pick<VersionedBookChunk, "id">,
): boolean {
  return chunk.id.startsWith(BOOKVERSE_ORIGINAL_V2_PREFIX);
}

function isCompleteOriginalV2<T extends VersionedBookChunk>(
  chunks: T[],
): boolean {
  if (chunks.length < BOOKVERSE_ORIGINAL_V2_PAGE_COUNT) return false;

  const chapterCounts = new Map<number, number>();
  for (const chunk of chunks) {
    chapterCounts.set(
      chunk.chapterNumber,
      (chapterCounts.get(chunk.chapterNumber) ?? 0) + 1,
    );
  }

  return (
    chapterCounts.size === 8 &&
    [...chapterCounts.values()].every((count) => count >= 4)
  );
}

/**
 * Reader chỉ ưu tiên nội dung v2 khi đủ trọn bộ 8 chương x 4 trang.
 * Nếu seed bị gián đoạn, hệ thống tiếp tục dùng nội dung cũ thay vì mở một sách dở dang.
 */
export function selectPreferredBookChunks<T extends VersionedBookChunk>(
  chunks: T[],
): T[] {
  const originalV2 = chunks.filter(isBookVerseOriginalV2Chunk);
  const selected = isCompleteOriginalV2(originalV2) ? originalV2 : chunks.filter(
    (chunk) => !isBookVerseOriginalV2Chunk(chunk),
  );

  return selected
    .map((chunk) => ({
      ...chunk,
      chapterNumber: isBookVerseOriginalV2Chunk(chunk)
        ? chunk.chapterNumber - BOOKVERSE_ORIGINAL_V2_CHAPTER_OFFSET
        : chunk.chapterNumber,
    }))
    .sort(
      (left, right) =>
        left.chapterNumber - right.chapterNumber ||
        left.chunkIndex - right.chunkIndex,
    );
}

export function usesBookVerseOriginalV2<T extends VersionedBookChunk>(
  chunks: T[],
): boolean {
  return (
    chunks.length > 0 &&
    chunks.every((chunk) => isBookVerseOriginalV2Chunk(chunk))
  );
}
