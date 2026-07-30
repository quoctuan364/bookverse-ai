export type AssistantRequestedLanguage = "vi" | "en" | null;

/**
 * Nhận diện ràng buộc ngôn ngữ được người dùng nói rõ trong câu hỏi.
 * Chỉ trả về kết quả khi có tín hiệu đủ chắc chắn để tránh lọc nhầm catalog.
 */
export function inferAssistantRequestedLanguage(query: string): AssistantRequestedLanguage {
  const normalized = query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (
    /\b(tieng viet|sach viet|van hoc viet nam|vietnamese)\b/.test(normalized)
  ) {
    return "vi";
  }
  if (/\b(tieng anh|sach anh|english)\b/.test(normalized)) {
    return "en";
  }
  return null;
}
