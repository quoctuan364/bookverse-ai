import type { HomeShelfBook } from "@/lib/home-shelf-types";

/**
 * Ưu tiên sách chưa xuất hiện ở các kệ phía trên. Khi catalog nhỏ, bổ sung lại
 * từ chính nguồn hợp lệ của kệ để không tạo dữ liệu giả hoặc làm kệ quá trống.
 */
export function selectHomeShelfBooks(
  candidates: HomeShelfBook[],
  seenBookIds: Set<string>,
  limit = 10,
): HomeShelfBook[] {
  const selected = candidates.filter((book) => !seenBookIds.has(book.id)).slice(0, limit);

  if (selected.length < Math.min(8, limit)) {
    for (const book of candidates) {
      if (selected.some((item) => item.id === book.id)) continue;
      selected.push(book);
      if (selected.length >= limit) break;
    }
  }

  selected.forEach((book) => seenBookIds.add(book.id));
  return selected;
}

