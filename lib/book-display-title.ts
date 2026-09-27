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

/**
 * Chỉ đưa vào đây các tên Việt đã được kiểm tra thủ công.
 * Bảng dịch tự động vẫn được giữ trong data/derived để đối chiếu, nhưng không dùng
 * làm tên chính vì bản dịch sát chữ có thể làm sai hoặc méo tên tác phẩm.
 */
export const REVIEWED_REAL_CATALOG_TITLES: Readonly<Record<string, string>> = {
  RB00003: "Cái hôn của tử thần",
  RB00013: "Nhà màu vàng",
  RB00022: "Màu sắc thú vật",
  RB00023: "Bị thiêu sống",
  RB00024: "Tinh hoa và sự phát triển của đạo Phật",
  RB00027: "Dây chuyền thiên sứ",
  RB00030: "Chuyến thư miền Nam",
  RB00037: "Diana - Công nương xứ Wales",
  RB00045: "Tình yêu ngọt ngào và cay đắng",
  RB00046: "Dế mèn, chim gáy, bồ nông...",
  RB00048: "Địa đàng ở phương Đông",
  RB00054: "Rồi sau đó...",
  RB00064: "Tự do trong lưu đày",
  RB00066: "Giông tố",
  RB00069: "Harry Potter và Phòng chứa bí mật",
  RB00071: "Harry Potter và Hoàng tử lai",
  RB00073: "Harry Potter và Hòn đá phù thủy",
  RB00078: "Lợi mỗi ngày được một giờ",
  RB00080: "Rực lửa miền băng tuyết",
  RB00081: "Mặt trận miền Tây vẫn yên tĩnh",
  RB00092: "Thảm cảnh chiến tranh",
  RB00103: "Chuyện thần tiên",
  RB00105: "Thư gửi người thi sĩ trẻ tuổi",
  RB00108: "Sống hay là chết",
  RB00112: "Tình yêu, khát vọng, hận thù",
  RB00114: "Nỗi buồn số phận",
  RB00124: "Ba tớ là người khổng lồ",
  RB00140: "Cú con tìm mẹ",
  RB00144: "Đa tình đa sát",
  RB00149: "Sự sống thời tiền sử",
  RB00165: "Tiệc sinh nhật cún con",
  RB00199: "Phép lạ của sự tỉnh thức",
  RB00200: "Phía bên kia nửa đêm",
  RB00201: "Hẹn yêu",
  RB00205: "Sự im lặng của bầy cừu",
  RB00213: "Người Mỹ xấu xí",
  RB00217: "Truy tìm sự thật",
  RB00218: "Phù thủy xứ Oz",
  RB00222: "Những khẩu đại pháo ở Navarone",
  RB00227: "Bóng ma Manhattan",
  RB00229: "Thế giới Phật giáo Tây Tạng",
  RB00232: "Thân phận của tình yêu",
  RB00236: "Trái tim mặt trời",
  RB00244: "Du hành vào lòng địa cầu",
  RB00247: "Chúng ta đi săn gấu",
  RB00252: "Minh triết trong đời sống",
  RB00463: "Trí tuệ nhân tạo",
  RB03001: "Bạn có thể chiến thắng",
  RB03008: "Bạn có thể chữa lành cuộc đời mình",
  RB03011: "Tiền hay cuộc sống",
  RB03012: "5 nước đi tiếp theo",
  RB03013: "Tiền hay cuộc sống",
  RB03017: "Từ 0 đến 1",
  RB03044: "Vấn đề ba thân",
  RB03046: "Tôi nói gì khi nói về chạy bộ",
};

export function hasVietnameseBookTitle(bookId: string): boolean {
  return Boolean(
    VIETNAMESE_BOOK_TITLES[bookId]?.trim() ||
      REVIEWED_REAL_CATALOG_TITLES[bookId]?.trim(),
  );
}

export function getVietnameseBookTitle(bookId: string, originalTitle: string | null | undefined): string {
  // Không cập nhật ngược vào PostgreSQL để giữ nguyên dữ liệu nguồn.
  const localizedTitle =
    VIETNAMESE_BOOK_TITLES[bookId]?.trim() ||
    REVIEWED_REAL_CATALOG_TITLES[bookId]?.trim();
  if (localizedTitle) return localizedTitle;

  const fallbackTitle = originalTitle?.trim();
  return fallbackTitle || "Chưa có tiêu đề";
}
