export const MIN_ASSISTANT_SESSION_TITLE_LENGTH = 3;
export const MAX_ASSISTANT_SESSION_TITLE_LENGTH = 80;

/**
 * Chuẩn hóa tiêu đề do người dùng nhập. Hàm thuần giúp kiểm thử mà không cần
 * kết nối database.
 */
export function normalizeAssistantSessionTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const title = value.replace(/\s+/g, " ").trim();
  if (
    title.length < MIN_ASSISTANT_SESSION_TITLE_LENGTH ||
    title.length > MAX_ASSISTANT_SESSION_TITLE_LENGTH
  ) {
    return null;
  }

  return title;
}
