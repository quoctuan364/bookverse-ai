import type { HomeShelfBook } from "@/lib/home-shelf-types";

/**
 * Ưu tiên sách chưa xuất hiện ở các kệ phía trên. Hỗ trợ xoay vòng hàng ngày (daily rotation)
 * theo offset ngày để mỗi ngày độc giả đăng nhập/truy cập đều thấy sách mới mẻ mà vẫn đúng
 * chất lượng và thuật toán tuyển chọn của kệ.
 */
export function selectHomeShelfBooks(
  candidates: HomeShelfBook[],
  seenBookIds: Set<string>,
  limit = 10,
  dailyOffset = 0,
): HomeShelfBook[] {
  if (candidates.length === 0) return [];

  // Xoay vòng mượt mà theo ngày nếu danh sách ứng viên dồi dào
  let rotatedCandidates = candidates;
  if (dailyOffset > 0 && candidates.length > limit) {
    const shift = dailyOffset % candidates.length;
    rotatedCandidates = [...candidates.slice(shift), ...candidates.slice(0, shift)];
  }

  const selected = rotatedCandidates.filter((book) => !seenBookIds.has(book.id)).slice(0, limit);

  if (selected.length < Math.min(8, limit)) {
    for (const book of rotatedCandidates) {
      if (selected.some((item) => item.id === book.id)) continue;
      selected.push(book);
      if (selected.length >= limit) break;
    }
  }

  selected.forEach((book) => seenBookIds.add(book.id));
  return selected;
}

