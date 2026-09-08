import bookTitleViMap from "@/data/derived/book-title-vi-map.json";

/**
 * Nhãn tiếng Việt dành cho giao diện catalog demo.
 * Chỉ đổi cách hiển thị; metadata và tên sách gốc trong PostgreSQL được giữ nguyên.
 */
export const VIETNAMESE_BOOK_TITLES: Readonly<Record<string, string>> = {
  B001: "Trí tuệ nhân tạo: Cách tiếp cận hiện đại",
  B002: "Hệ thống gợi ý: Giáo trình chuyên sâu",
  B003: "Python thông thạo",
  B004: "Học React",
  B005: "Thiết kế ứng dụng chuyên sâu về dữ liệu",
  B006: "Python cho phân tích dữ liệu",
  B007: "Khởi nghiệp tinh gọn",
  B008: "Hiệu ứng lan truyền",
  B009: "Thiết kế của những điều thường ngày",
  B010: "Thay đổi tí hon, hiệu quả bất ngờ",
  B011: "Tâm lý học về tiền",
  B012: "Tư duy nhanh và chậm",
  B013: "Nhà giả kim",
  B014: "Tâm lý học thành công",
  B015: "Từ Không đến Một",
  B016: "Thực hành học máy với Scikit-Learn, Keras và TensorFlow",
  B017: "Kể chuyện bằng dữ liệu",
  B018: "Thiết kế cơ sở dữ liệu cho người mới",
  B019: "Tạo ra thông điệp kết dính",
  B020: "Mã sạch",
};

interface LocalizedBookTitleRecord {
  id: string;
  vietnameseTitle: string;
}

const GENERATED_VIETNAMESE_BOOK_TITLES = new Map(
  (bookTitleViMap.books as LocalizedBookTitleRecord[]).map((book) => [
    book.id,
    book.vietnameseTitle.trim(),
  ]),
);

export function getVietnameseBookTitle(bookId: string, originalTitle: string | null | undefined): string {
  // 20 sách demo dùng bản dịch biên tập thủ công; catalog lớn dùng bảng dịch
  // đã sinh sẵn. Không cập nhật ngược vào PostgreSQL để giữ dữ liệu nguồn.
  const localizedTitle =
    VIETNAMESE_BOOK_TITLES[bookId]?.trim() ||
    GENERATED_VIETNAMESE_BOOK_TITLES.get(bookId)?.trim();
  if (localizedTitle) return localizedTitle;

  const fallbackTitle = originalTitle?.trim();
  return fallbackTitle || "Chưa có tiêu đề";
}
