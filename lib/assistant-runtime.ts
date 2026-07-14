import type { AssistantValidatedBook } from "@/lib/assistant-contract";

export function buildGroundedLocalAnswer(
  message: string,
  books: AssistantValidatedBook[],
): string {
  if (books.length === 0) {
    return (
      `Mình chưa tìm thấy sách đã xác minh phù hợp với “${message}”. ` +
      "Bạn hãy bổ sung thể loại, mục tiêu đọc hoặc ngân sách để mình tìm lại trong catalog."
    );
  }

  const bookList = books
    .slice(0, 3)
    .map((book) => `${book.title} của ${book.author}`)
    .join("; ");
  return (
    `Hiện dịch vụ AI bên ngoài chưa sẵn sàng. Dựa trên catalog BookVerse đã xác minh, ` +
    `bạn có thể tham khảo: ${bookList}. Đây là kết quả dự phòng từ dữ liệu nội bộ, không phải phản hồi AI giả.`
  );
}

export function buildDevelopmentMockAnswer(
  message: string,
  books: AssistantValidatedBook[],
): string {
  const context = books.slice(0, 2).map((book) => book.title).join(" và ");
  return context
    ? `[DEV MOCK] Với câu hỏi “${message}”, dữ liệu thử đang tham chiếu ${context}.`
    : `[DEV MOCK] Đã nhận câu hỏi “${message}”.`;
}

export function sanitizeAssistantLog(error: unknown): string {
  const message = error instanceof Error ? error.message : "Lỗi không xác định.";
  return message
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[DATABASE_URL_REDACTED]")
    .replace(/\b(key|token|secret)=([^&\s]+)/gi, "$1=[REDACTED]")
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[REDACTED]")
    .slice(0, 500);
}

export async function runWithAssistantFallback<T>(
  primary: () => Promise<T>,
  fallback: (error: unknown) => Promise<T> | T,
): Promise<T> {
  try {
    return await primary();
  } catch (error: unknown) {
    return fallback(error);
  }
}
