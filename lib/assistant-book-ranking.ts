import { normalizeAssistantQuery } from "./assistant-knowledge";

export type AssistantBookRankingKind =
  | "BEST_SELLING"
  | "MOST_READ"
  | "TOP_RATED";

/**
 * Nhận diện các câu hỏi xếp hạng phổ biến. Tách riêng khỏi truy vấn database để
 * có thể kiểm thử cách hiểu ngôn ngữ tự nhiên mà không cần dữ liệu mẫu.
 */
export function detectAssistantBookRanking(
  message: string,
): AssistantBookRankingKind | null {
  const query = normalizeAssistantQuery(message);

  if (/\b(ban chay|mua nhieu|duoc mua nhieu|nhieu nguoi mua)\b/.test(query)) {
    return "BEST_SELLING";
  }
  if (/\b(nhieu nguoi doc|duoc doc nhieu|doc nhieu nhat|luot doc|pho bien|xem nhieu|xem nhieu nhat|nhieu nguoi xem|thinh hanh|hot nhat|xu huong|trending|hot|sach trending|dang trending)\b/.test(query)) {
    return "MOST_READ";
  }
  if (
    /\b(danh gia cao|diem cao|duoc yeu thich|hay nhat)\b/.test(query) ||
    /\b(sach nao hay|cuon nao hay|cuon sach nao hay)\b/.test(query)
  ) {
    return "TOP_RATED";
  }

  return null;
}

export function describeAssistantBookRanking(
  kind: AssistantBookRankingKind,
): { heading: string; evidence: string; empty: string } {
  switch (kind) {
    case "BEST_SELLING":
      return {
        heading: "Những cuốn bán chạy nhất hiện có",
        evidence: "số lượng sách trong các đơn đã thanh toán, đang giao hoặc đã hoàn tất",
        empty: "Hiện BookVerse chưa có đủ đơn hàng hợp lệ để xác định sách bán chạy.",
      };
    case "MOST_READ":
      return {
        heading: "Những cuốn được nhiều người đọc nhất",
        evidence: "số độc giả đã phát sinh tiến độ đọc",
        empty: "Hiện BookVerse chưa có đủ tiến độ đọc để xác định sách được đọc nhiều nhất.",
      };
    case "TOP_RATED":
      return {
        heading: "Những cuốn được đánh giá cao",
        evidence: "điểm đánh giá và số lượt đánh giá",
        empty: "Hiện BookVerse chưa có đủ lượt đánh giá để xếp hạng sách hay.",
      };
  }
}
