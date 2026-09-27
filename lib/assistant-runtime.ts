import type { AssistantValidatedBook } from "@/lib/assistant-contract";
import { isBookContextFollowUp } from "./assistant-book-context";
import {
  describeAssistantBookRanking,
  type AssistantBookRankingKind,
} from "./assistant-book-ranking";
import { extractAssistantBookFilters } from "./assistant-book-search";
import {
  formatStoreFacts,
  normalizeAssistantQuery,
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
  rankingKind?: AssistantBookRankingKind | null;
}

function buildConversationalAnswer(message: string): string | null {
  const query = normalizeAssistantQuery(message);
  if (/^(xin chao|chao|hello|hi|alo)( ban| nhe| nova| tro ly)?[!.]*$/.test(query)) {
    return "Chào bạn! Mình là Nova, trợ lý đọc sách của BookVerse. Hôm nay bạn muốn tìm một cuốn sách, hỏi về sách đang xem hay cần hỗ trợ sử dụng website?";
  }
  if (/^(cam on|cam on ban|cam on nova|thanks|thank you)( nhe| nha)?[!.]*$/.test(query)) {
    return "Không có gì, mình rất vui được giúp bạn. Bạn có thể hỏi tiếp về cuốn vừa chọn hoặc đổi sang một chủ đề sách khác nhé.";
  }
  if (/\b(ban la ai|ten gi|ten ban la gi)\b/.test(query)) {
    return "Mình là Nova, trợ lý đọc sách của BookVerse. Mình giúp tìm sách tiếng Việt, giới thiệu thông tin đã có, giữ ngữ cảnh cuốn đang trao đổi và hướng dẫn các chức năng của website.";
  }
  if (/\b(lam duoc gi|giup duoc gi|co the lam gi|chuc nang gi)\b/.test(query)) {
    return "Mình có thể tìm sách theo chủ đề, tác giả hoặc tên sách; cho bạn biết sách nào bán chạy, được đọc nhiều hoặc đánh giá cao dựa trên dữ liệu BookVerse; trò chuyện tiếp về cuốn đang xem; đồng thời hướng dẫn hội viên, đơn hàng, thư viện, chợ sách và tài khoản. Bạn muốn bắt đầu từ việc nào?";
  }
  if (/\b(khoe khong|hom nay the nao|dang lam gi)\b/.test(query)) {
    return "Mình đang sẵn sàng trò chuyện và tìm sách cùng bạn đây. Còn bạn đang muốn đọc để học, thư giãn hay tìm cảm hứng?";
  }
  if (/^(tam biet|bye|hen gap lai)( nhe| nha)?[!.]*$/.test(query)) {
    return "Tạm biệt bạn! Khi cần tìm sách hoặc hỏi tiếp về cuốn đang đọc, cứ quay lại gọi Nova nhé.";
  }
  return null;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(value);
}

function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return "chưa có thông tin giá";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildBookComparisonAnswer(books: AssistantValidatedBook[], query: string): string {
  const lines = books.slice(0, 5).map((book, index) =>
    `${index + 1}. ${book.title} — ${book.author}\n` +
    `Giá: ${formatPrice(book.price)} · Số trang: ${book.pages ?? "chưa có"} · ` +
    `Năm: ${book.publishYear ?? "chưa có"} · Ngôn ngữ: ${book.language ?? "chưa có"} · ` +
    `Điểm: ${book.rating ?? "chưa có"}`,
  );
  const known = <T,>(selector: (book: AssistantValidatedBook) => T | null | undefined) =>
    books.filter((book) => selector(book) !== null && selector(book) !== undefined);
  let conclusion = "Mình chưa đủ dữ liệu để kết luận cuốn nào phù hợp hơn; bạn có thể chọn theo chủ đề và phần đọc thử.";
  if (/\b(re hon|gia thap hon)\b/.test(query)) {
    const candidates = known((book) => book.price);
    if (candidates.length) conclusion = `Rẻ nhất trong số này là “${candidates.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0].title}”.`;
  } else if (/\b(dat hon|gia cao hon)\b/.test(query)) {
    const candidates = known((book) => book.price);
    if (candidates.length) conclusion = `Đắt nhất trong số này là “${candidates.sort((a, b) => (b.price ?? 0) - (a.price ?? 0))[0].title}”.`;
  } else if (/\b(ngan hon|it trang hon|doc nhanh hon)\b/.test(query)) {
    const candidates = known((book) => book.pages);
    if (candidates.length) conclusion = `Ngắn nhất theo số trang bản in là “${candidates.sort((a, b) => (a.pages ?? Infinity) - (b.pages ?? Infinity))[0].title}”.`;
  } else if (/\b(dai hon|nhieu trang hon)\b/.test(query)) {
    const candidates = known((book) => book.pages);
    if (candidates.length) conclusion = `Dài nhất theo số trang bản in là “${candidates.sort((a, b) => (b.pages ?? 0) - (a.pages ?? 0))[0].title}”.`;
  } else if (/\b(moi hon|xuat ban gan day)\b/.test(query)) {
    const candidates = known((book) => book.publishYear);
    if (candidates.length) conclusion = `Xuất bản gần đây nhất là “${candidates.sort((a, b) => (b.publishYear ?? 0) - (a.publishYear ?? 0))[0].title}”.`;
  } else if (/\b(diem cao hon|danh gia cao hon|hay hon)\b/.test(query)) {
    const candidates = known((book) => book.rating);
    if (candidates.length) conclusion = `Có điểm đánh giá cao nhất là “${candidates.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0].title}”. Điểm số không thay thế sở thích cá nhân của bạn.`;
  }
  return `Mình đối chiếu thông tin hiện có:\n\n${lines.join("\n\n")}\n\n${conclusion}`;
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
  const roles: Record<string, string> = { BUYER: "độc giả", USER: "độc giả", SELLER: "người bán sách", ADMIN: "quản trị viên", MODERATOR: "người kiểm duyệt" };
  return `Bạn đang đăng nhập với vai trò ${roles[account.role ?? ""] ?? "độc giả"}. Thư viện cá nhân nằm tại /library.`;
}

export function buildGroundedLocalAnswer(
  message: string,
  books: AssistantValidatedBook[],
  context: GroundedAnswerContext = {},
): string {
  const query = normalizeAssistantQuery(message);
  const conversationalAnswer = buildConversationalAnswer(message);
  if (conversationalAnswer) return conversationalAnswer;
  if (context.rankingKind) {
    const ranking = describeAssistantBookRanking(context.rankingKind);
    if (books.length === 0) {
      return `${ranking.empty} Mình sẽ chỉ xếp hạng khi có dữ liệu thật, không tự đoán tên sách.`;
    }
    const bookList = books
      .slice(0, 5)
      .map((book, index) => `${index + 1}. ${book.title} — ${book.author}`)
      .join("\n");
    return `${ranking.heading}:\n\n${bookList}\n\nThứ tự này dựa trên ${ranking.evidence} trong BookVerse. Bạn muốn mình giới thiệu kỹ cuốn số mấy?`;
  }
  if (isBookContextFollowUp(message) && books.length === 0) {
    return "Bạn muốn hỏi về cuốn sách nào? Hãy ghi tên sách hoặc chọn một cuốn trong các gợi ý trước đó để mình trả lời đúng nhé.";
  }
  if (isBookContextFollowUp(message) && books.length > 1) {
    if (/\b(so sanh|re hon|gia thap hon|dat hon|gia cao hon|ngan hon|it trang hon|doc nhanh hon|dai hon|nhieu trang hon|moi hon|xuat ban gan day|diem cao hon|danh gia cao hon|hay hon|de doc hon)\b/.test(query)) {
      return buildBookComparisonAnswer(books, query);
    }
    return `Mình đang có ${books.length} cuốn trong cuộc trò chuyện:\n${books.map((book, index) => `${index + 1}. ${book.title} — ${book.author}`).join("\n")}\n\nBạn muốn tìm hiểu cuốn nào? Bạn có thể nói “cuốn thứ hai”, ghi tên sách hoặc chọn cuốn bên dưới. Mình chưa có đủ nội dung để kết luận cuốn nào hay hoặc dễ đọc hơn.`;
  }
  if (books.length === 1) {
    const book = books[0];
    const requestedFacts: string[] = [];
    const wantsPrice = !/\bdanh gia\b/.test(query) && /\b(gia sach|gia cuon|gia bao nhieu|bao nhieu tien|mua bao nhieu)\b/.test(query);
    const wantsPages = /\b(bao nhieu trang|so trang|dai bao nhieu)\b/.test(query);
    const wantsYear = /\b(xuat ban nam nao|nam xuat ban|ra mat nam nao)\b/.test(query);
    const wantsLanguage = /\b(ngon ngu gi|tieng gi|co ban tieng viet)\b/.test(query);
    const wantsCategory = /\b(the loai gi|thuoc the loai|chu de gi)\b/.test(query);
    const wantsRating = /\b(danh gia bao nhieu|may sao|diem bao nhieu)\b/.test(query);

    if (wantsPrice) requestedFacts.push(`Giá niêm yết: ${formatPrice(book.price)}`);
    if (wantsPages) requestedFacts.push(`Số trang: ${book.pages?.toLocaleString("vi-VN") ?? "chưa có thông tin"}`);
    if (wantsYear) requestedFacts.push(`Năm xuất bản: ${book.publishYear ?? "chưa có thông tin"}`);
    if (wantsLanguage) requestedFacts.push(`Ngôn ngữ: ${book.language ?? "chưa có thông tin"}`);
    if (wantsCategory) requestedFacts.push(`Thể loại: ${book.category ?? "chưa có thông tin"}`);
    if (wantsRating) requestedFacts.push(`Điểm đánh giá: ${book.rating !== null && book.rating !== undefined ? `${book.rating.toFixed(1)}/5` : "chưa đủ dữ liệu"}`);
    // Với câu hỏi ghép, trả đủ các ý thay vì dừng ở thuộc tính đầu tiên.
    if (requestedFacts.length > 1) {
      return `Thông tin hiện có về “${book.title}”:\n\n${requestedFacts.map((fact) => `• ${fact}`).join("\n")}\n\nCác dữ liệu trên thuộc bản sách đang hiển thị trong BookVerse.`;
    }
    if (/\b(tac gia|ai viet|viet boi ai)\b/.test(query)) {
      return `“${book.title}” có tác giả là ${book.author}, theo thông tin trong BookVerse.`;
    }
    if (wantsPrice) {
      return book.price !== null && book.price !== undefined
        ? `“${book.title}” của ${book.author} hiện có giá niêm yết ${formatPrice(book.price)} trên BookVerse. Giá của từng tin bán có thể khác; mở thẻ sách để xem lựa chọn đang còn hàng.`
        : `BookVerse chưa có thông tin giá cho “${book.title}”. Mở trang sách để xem các tin bán hiện có.`;
    }
    if (wantsPages) {
      return book.pages
        ? `“${book.title}” có ${book.pages.toLocaleString("vi-VN")} trang theo thông tin bản in.`
        : `BookVerse chưa có thông tin số trang của “${book.title}”.`;
    }
    if (wantsYear) {
      return book.publishYear
        ? `“${book.title}” được xuất bản năm ${book.publishYear} theo thông tin hiện có.`
        : `BookVerse chưa có thông tin năm xuất bản của “${book.title}”.`;
    }
    if (wantsLanguage) {
      return book.language
        ? `Ngôn ngữ của bản sách đang hiển thị là ${book.language}.`
        : `BookVerse chưa có thông tin ngôn ngữ của “${book.title}”.`;
    }
    if (wantsCategory) {
      return book.category
        ? `“${book.title}” thuộc thể loại ${book.category}.`
        : `BookVerse chưa có thông tin thể loại của “${book.title}”.`;
    }
    if (wantsRating) {
      return book.rating !== null && book.rating !== undefined
        ? `“${book.title}” đang có điểm ${book.rating.toFixed(1)}/5 trong dữ liệu BookVerse.`
        : `“${book.title}” chưa có đủ dữ liệu đánh giá để báo điểm.`;
    }
    return `Về “${book.title}” của ${book.author}:\n\n${book.description?.trim() || "Sách này chưa có phần giới thiệu trong BookVerse, nên mình chưa đủ căn cứ để tóm tắt hoặc đánh giá nội dung."}\n\nBạn có thể mở thẻ sách bên dưới để xem thông tin và phần đọc thử nếu có. Thông tin trên được lấy từ dữ liệu BookVerse.`;
  }
  const knowledge = context.knowledge ?? [];
  const parts: string[] = [];
  const accountAnswer = buildAccountAnswer(message, context.intent, context.account);
  if (accountAnswer) parts.push(accountAnswer);

  if (context.intent === "CATALOG" && context.store) {
    parts.push(`Số liệu hiện tại của BookVerse: ${formatStoreFacts(context.store)}.`);
  }

  if (context.intent === "DISCOVERY" && books.length === 0) {
    return "Mình chưa tìm thấy cuốn phù hợp trong kho sách công khai với mô tả này. Bạn nói thêm giúp mình một ý nhé: chủ đề, tác giả, trình độ, muốn đọc ngắn hay dài, hoặc mục đích đọc. Ví dụ: “Mình mới học AI, muốn sách tiếng Việt dễ đọc”.";
  }

  if (knowledge.length > 0 && books.length === 0) {
    const primary = knowledge[0];
    parts.push(primary.summary);
    if (primary.details.length > 0) {
      parts.push(primary.details.slice(0, 3).map((detail) => `• ${detail}`).join("\n"));
    }
    parts.push(`Xem thêm: ${primary.href}`);
  }

  if (books.length > 0) {
    const filters = extractAssistantBookFilters(message);
    const bookList = books
      .slice(0, 3)
      .map((book, index) => {
        const description = book.description?.trim();
        const filterFacts = [
          filters.maxPrice !== null || filters.preferLowPrice ? `Giá ${formatPrice(book.price)}` : null,
          filters.maxPages !== null || filters.preferShort ? `${book.pages ?? "chưa rõ"} trang` : null,
          filters.minPublishYear !== null ? `Xuất bản ${book.publishYear ?? "chưa rõ"}` : null,
        ].filter(Boolean).join(" · ");
        const reason = filterFacts || (description
          ? description.length > 180
            ? `${description.slice(0, 177)}...`
            : description
          : "Sách chưa có phần giới thiệu. Bạn có thể mở trang chi tiết để xem thông tin hiện có.");
        return `${index + 1}. ${book.title} — ${book.author}\n${reason}`;
      })
      .join("\n\n");
    parts.push(`Mình tìm được các sách phù hợp sau:\n${bookList}`);
    parts.push(
      "Bạn có thể mở thẻ sách để xem chi tiết, chọn “Hỏi về cuốn sách này” hoặc ghi rõ tên sách muốn tìm hiểu. Mình chỉ nhận xét dựa trên thông tin sách hiện có.",
    );
  }

  if (parts.length > 0) {
    return `${parts.join("\n\n")}\n\nThông tin trên được lấy từ dữ liệu BookVerse.`;
  }

  if (books.length === 0) {
    return (
      `Mình chưa có đủ thông tin để trả lời chính xác câu “${message}”. ` +
      "Bạn có thể hỏi về tìm sách, hội viên, đọc sách điện tử, đơn hàng, chợ sách, tài khoản hoặc chính sách BookVerse."
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
