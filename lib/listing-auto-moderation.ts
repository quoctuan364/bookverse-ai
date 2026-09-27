export interface ListingAutoModerationInput {
  title: string;
  description: string;
  price: number;
  hasCatalogBook: boolean;
  imageCount: number;
}

export interface ListingAutoModerationResult {
  approved: boolean;
  reasons: string[];
  score: number;
}

/**
 * Kiểm tra tự động, minh bạch cho tin bán C2C.
 * Quy tắc cố định giúp đồ án dễ giải thích và không phụ thuộc vào AI bên ngoài.
 * Admin chỉ cần xử lý tin thiếu thông tin hoặc bị người dùng báo cáo.
 */
export function evaluateListingForAutoApproval(
  input: ListingAutoModerationInput,
): ListingAutoModerationResult {
  const title = input.title.replace(/\s+/gu, " ").trim();
  const description = input.description.replace(/\s+/gu, " ").trim();
  const reasons: string[] = [];
  let score = 0;

  if (title.length >= 10) score += 25;
  else reasons.push("Tiêu đề cần ít nhất 10 ký tự.");

  if (description.length >= 40) score += 35;
  else reasons.push("Mô tả cần ít nhất 40 ký tự.");

  if (Number.isFinite(input.price) && input.price >= 1_000 && input.price <= 100_000_000) {
    score += 25;
  } else {
    reasons.push("Giá bán phải từ 1.000đ đến 100.000.000đ.");
  }

  if (input.hasCatalogBook || input.imageCount > 0) score += 15;
  else reasons.push("Cần chọn sách trong thư viện hoặc thêm ít nhất một ảnh thật.");

  return {
    approved: reasons.length === 0,
    reasons,
    score,
  };
}
