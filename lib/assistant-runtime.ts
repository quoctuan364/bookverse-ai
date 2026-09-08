import type { AssistantValidatedBook } from "@/lib/assistant-contract";
import {
  formatStoreFacts,
  queryWantsAccountData,
  type AssistantAccountContext,
  type AssistantStoreContext,
  type BookVerseIntent,
  type BookVerseKnowledgeArticle,
} from "@/lib/assistant-knowledge";

interface GroundedAnswerContext {
  intent?: BookVerseIntent;
  knowledge?: BookVerseKnowledgeArticle[];
  store?: AssistantStoreContext;
  account?: AssistantAccountContext;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(value);
}

function buildAccountAnswer(
  message: string,
  intent: BookVerseIntent | undefined,
  account: AssistantAccountContext | undefined,
): string | null {
  if (
    !account ||
    !queryWantsAccountData(message) ||
    !["MEMBERSHIP", "ORDERS", "ACCOUNT", "READING"].includes(intent ?? "")
  ) {
    return null;
  }
  if (!account.authenticated) {
    return "Bạn chưa đăng nhập nên mình không thể xem dữ liệu cá nhân. Hãy đăng nhập rồi hỏi lại để mình kiểm tra đúng tài khoản.";
  }
  if (intent === "MEMBERSHIP") {
    if (account.membership?.active) {
      const endText = account.membership.endsAt
        ? ` đến ${formatDate(account.membership.endsAt)}`
        : "";
      return `Tài khoản ${account.displayName ?? "của bạn"} đang có gói ${
        account.membership.planName ?? "hội viên"
      } còn hiệu lực${endText}.`;
    }
    return "Tài khoản của bạn hiện chưa có gói hội viên còn hiệu lực.";
  }
  if (intent === "ORDERS") {
    return `Tài khoản của bạn có ${account.cartItemCount} sản phẩm trong giỏ và ${account.orderCount} đơn đã tạo. Mở /orders để xem trạng thái từng đơn.`;
  }
  if (intent === "READING") {
    return `Bạn đã bắt đầu ${account.readingBooks} cuốn và hoàn thành ${account.completedBooks} cuốn trong dữ liệu tiến độ hiện có.`;
  }
  return `Bạn đang đăng nhập với vai trò ${account.role ?? "độc giả"}. Thư viện cá nhân nằm tại /library.`;
}

export function buildGroundedLocalAnswer(
  message: string,
  books: AssistantValidatedBook[],
  context: GroundedAnswerContext = {},
): string {
  const knowledge = context.knowledge ?? [];
  const parts: string[] = [];
  const accountAnswer = buildAccountAnswer(message, context.intent, context.account);
  if (accountAnswer) parts.push(accountAnswer);

  if (context.intent === "CATALOG" && context.store) {
    parts.push(`Số liệu hiện tại của BookVerse: ${formatStoreFacts(context.store)}.`);
  }

  if (knowledge.length > 0) {
    const primary = knowledge[0];
    parts.push(primary.summary);
    if (primary.details.length > 0) {
      parts.push(primary.details.slice(0, 3).map((detail) => `• ${detail}`).join("\n"));
    }
    parts.push(`Xem thêm: ${primary.href}`);
  }

  if (books.length > 0) {
    const bookList = books
      .slice(0, 3)
      .map((book) => `${book.title} của ${book.author}`)
      .join("; ");
    parts.push(`Sách phù hợp trong catalog đã xác minh: ${bookList}.`);
  }

  if (parts.length > 0) {
    return `${parts.join("\n\n")}\n\nĐây là câu trả lời dự phòng từ dữ liệu nội bộ BookVerse, không phải phản hồi AI giả.`;
  }

  if (books.length === 0) {
    return (
      `Mình chưa có đủ dữ liệu đã xác minh để trả lời chính xác câu “${message}”. ` +
      "Bạn có thể hỏi về tìm sách, hội viên, đọc Ebook, đơn hàng, chợ sách, tài khoản hoặc chính sách BookVerse."
    );
  }
  return "Mình chưa có đủ ngữ cảnh để trả lời.";
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
