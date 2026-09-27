import { ChatbotMessageRole } from "@prisma/client";

import {
  ASSISTANT_CONTRACT_VERSION,
  type AssistantDegradedCode,
  type AssistantFailureCode,
  type AssistantProvider,
  type AssistantSource,
  type AssistantSuccessResponse,
  type AssistantValidatedBook,
} from "@/lib/assistant-contract";
import {
  evaluateSessionAccess,
  getAssistantTimeoutMs,
  isDevelopmentMockEnabled,
  selectRequestedSessionId,
} from "@/lib/assistant-policy";
import {
  buildDevelopmentMockAnswer,
  buildGroundedLocalAnswer,
  runWithAssistantFallback,
  sanitizeAssistantLog,
} from "@/lib/assistant-runtime";
import { inferAssistantRequestedLanguage } from "@/lib/assistant-language";
import { isAlternativeBookRequest, isBookContextFollowUp, selectContextBookIds } from "@/lib/assistant-book-context";
import {
  extractAssistantBookFilters,
  rankAssistantBooks,
} from "@/lib/assistant-book-search";
import {
  detectAssistantBookRanking,
  type AssistantBookRankingKind,
} from "@/lib/assistant-book-ranking";
import { getVietnameseBookTitle, hasVietnameseBookTitle } from "@/lib/book-display-title";
import { selectPreferredBookChunks } from "@/lib/book-content-version";
import {
  classifyBookVerseIntent,
  buildAssistantRetrievalQuery,
  extractQuotedBookTitle,
  formatStoreFacts,
  queryWantsAccountData,
  retrieveBookVerseKnowledge,
  shouldRetrieveBooks,
  type AssistantAccountContext,
  type AssistantStoreContext,
  type BookVerseIntent,
  type BookVerseKnowledgeArticle,
} from "@/lib/assistant-knowledge";
import type { CurrentUserSession } from "@/lib/permissions";
import { getBookReadingAccess } from "@/lib/membership-access";
import prisma from "@/lib/prisma";
import { publicBookQualityWhere } from "@/lib/public-book-policy";
import { decideReadingAccess } from "@/lib/reading-access-policy";
import {
  buildLocalGroundedReaderAnswer,
  rankReaderRagChunks,
} from "@/lib/reader-rag";

const SYSTEM_PROMPT = `Bạn là Trợ lý AI của nhà sách BookVerse.
Trả lời bằng tiếng Việt, rõ ràng, thân thiện và ưu tiên câu trả lời trực tiếp.
Bạn có thể hỗ trợ mọi chức năng công khai của BookVerse: tìm và lọc sách, hội viên, đọc sách, thư viện, mục tiêu đọc, hồ sơ, ảnh đại diện, địa chỉ, thông báo, đơn hàng, chợ sách, người bán, cộng đồng và chính sách.
Chỉ nhắc đến sách, số liệu, trạng thái tài khoản hoặc đường dẫn có trong ngữ cảnh đã xác minh.
Không tự tạo mã sách, giá, đường dẫn, trạng thái đơn hoặc quyền hội viên.
Nếu ngữ cảnh không đủ, hãy nói rõ điều chưa biết và hướng dẫn người dùng tới trang phù hợp.
Khi có đường dẫn trong tri thức, hãy ghi đường dẫn đó nguyên dạng để giao diện biến thành nút điều hướng.
Không gọi dữ liệu demo là giao dịch thật và không tuyên bố cá nhân hóa khi không có dữ liệu tài khoản.`;

interface AssistantServiceInput {
  message: string;
  sessionId?: string;
  contextBookIds?: string[];
  focusedBookId?: string;
  contextQuery?: string;
  currentUser: CurrentUserSession | null;
}

interface ChatMessageForLlm {
  role: "user" | "assistant";
  content: string;
}

interface RetrievalResult {
  books: AssistantValidatedBook[];
  source: AssistantSource;
  degraded: boolean;
  errorCode: AssistantDegradedCode | null;
}

interface ReplyResult {
  provider: AssistantProvider;
  model: string;
  answer: string;
  mocked: boolean;
  degraded: boolean;
  errorCode: AssistantDegradedCode | null;
}

interface AssistantGroundingContext {
  intent: BookVerseIntent;
  knowledge: BookVerseKnowledgeArticle[];
  store: AssistantStoreContext;
  account: AssistantAccountContext;
  rankingKind: AssistantBookRankingKind | null;
}

const EMPTY_STORE_CONTEXT: AssistantStoreContext = {
  activeBooks: 0,
  readableBooks: 0,
  categories: 0,
  activePlans: 0,
  approvedListings: 0,
};

const EMPTY_ACCOUNT_CONTEXT: AssistantAccountContext = {
  authenticated: false,
  displayName: null,
  role: null,
  membership: null,
  cartItemCount: 0,
  orderCount: 0,
  readingBooks: 0,
  completedBooks: 0,
};

async function getFocusedBookContentReply(
  input: AssistantServiceInput,
  focusedBookIsPublic: boolean,
): Promise<ReplyResult | null> {
  const focusedBookId = input.focusedBookId?.trim();
  if (!focusedBookId || !focusedBookIsPublic) return null;

  const storedChunks = await prisma.bookChunk.findMany({
    where: { bookId: focusedBookId },
    orderBy: [{ chapterNumber: "asc" }, { chunkIndex: "asc" }],
    select: {
      id: true,
      chapterNumber: true,
      chapterTitle: true,
      pageNumber: true,
      chunkIndex: true,
      content: true,
    },
  });
  const preferredChunks = selectPreferredBookChunks(storedChunks);
  if (preferredChunks.length === 0) return null;

  const readingAccess = await getBookReadingAccess(
    input.currentUser && !input.currentUser.isLocked ? input.currentUser.id : null,
    focusedBookId,
  );
  const accessDecision = decideReadingAccess({
    totalPages: preferredChunks.length,
    hasEntitlement: readingAccess.hasAccess,
  });
  const availableChunks = preferredChunks.slice(0, accessDecision.visiblePages);
  const relevantChunks = rankReaderRagChunks(
    availableChunks,
    input.message,
    availableChunks[0]?.chapterNumber ?? 1,
    5,
  );
  if (relevantChunks.length === 0) return null;

  const accessNotice = readingAccess.hasAccess
    ? ""
    : "Bạn đang hỏi trên phần đọc thử (tối đa 10% nội dung).\n\n";

  return {
    provider: "local",
    model: "local-book-content-rag-v1",
    answer: `${accessNotice}${buildLocalGroundedReaderAnswer(input.message, relevantChunks)}`,
    mocked: false,
    degraded: false,
    errorCode: null,
  };
}

export class AssistantServiceError extends Error {
  constructor(
    public readonly code: AssistantFailureCode,
    message: string,
    public readonly status: number,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "AssistantServiceError";
  }
}

function failureForAccess(code: AssistantFailureCode): AssistantServiceError {
  switch (code) {
    case "ACCOUNT_LOCKED":
      return new AssistantServiceError(
        code,
        "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.",
        403,
      );
    case "SESSION_NOT_FOUND":
      return new AssistantServiceError(code, "Không tìm thấy phiên chat.", 404);
    case "SESSION_FORBIDDEN":
      return new AssistantServiceError(code, "Bạn không có quyền sử dụng phiên chat này.", 403);
    default:
      return new AssistantServiceError(code, "Không thể truy cập phiên chat.", 403);
  }
}

function buildSystemPrompt(
  books: AssistantValidatedBook[],
  grounding: AssistantGroundingContext,
): string {
  const bookContext = books
    .map(
      (book, index) =>
        `${index + 1}. ${book.title}\nTác giả: ${book.author}\nĐiểm phù hợp: ${book.score.toFixed(
          3,
        )}\nGiá: ${book.price ?? "Chưa có"}\nSố trang: ${book.pages ?? "Chưa có"}\nNăm xuất bản: ${book.publishYear ?? "Chưa có"}\nNgôn ngữ: ${book.language ?? "Chưa có"}\nThể loại: ${book.category ?? "Chưa có"}\nĐiểm đánh giá: ${book.rating ?? "Chưa có"}\nMô tả: ${book.description ?? "Chưa có mô tả."}`,
    )
    .join("\n\n");
  const knowledgeContext = grounding.knowledge
    .map(
      (article, index) =>
        `${index + 1}. ${article.title}\n${article.summary}\n${article.details.join(
          "\n",
        )}\nRoute: ${article.href}`,
    )
    .join("\n\n");
  const account = grounding.account;
  const accountContext = account.authenticated
    ? [
        `Tên: ${account.displayName ?? "Chưa có"}`,
        `Vai trò: ${account.role ?? "Chưa rõ"}`,
        `Hội viên còn hạn: ${account.membership?.active ? "Có" : "Không"}`,
        `Gói: ${account.membership?.planName ?? "Không có"}`,
        `Hết hạn: ${account.membership?.endsAt?.toISOString() ?? "Không có"}`,
        `Sản phẩm trong giỏ: ${account.cartItemCount}`,
        `Số đơn đã tạo: ${account.orderCount}`,
        `Sách đã bắt đầu: ${account.readingBooks}`,
        `Sách hoàn thành: ${account.completedBooks}`,
      ].join("\n")
    : "Người dùng chưa đăng nhập. Không được suy đoán dữ liệu cá nhân.";

  return [
    SYSTEM_PROMPT,
    `Ý định đã phân loại: ${grounding.intent}`,
    `Số liệu nhà sách hiện tại: ${formatStoreFacts(grounding.store)}`,
    `Ngữ cảnh tài khoản hiện tại:\n${accountContext}`,
    knowledgeContext
      ? `Tri thức nghiệp vụ BookVerse đã xác minh:\n${knowledgeContext}`
      : "Không có bài tri thức nghiệp vụ khớp trực tiếp.",
    bookContext
      ? `Thông tin kho sách đã xác minh:\n${bookContext}`
      : "Không có sách nào được truy xuất cho câu hỏi này. Không được tự đề xuất tên sách.",
  ].join("\n\n");
}

function mapBook(
  book: {
    id: string;
    title: string;
    authorName: string;
    description: string | null;
    languageCode?: string | null;
    price?: unknown;
    pages?: number | null;
    publishYear?: number | null;
    rating?: unknown;
    category?: { name: string; canonicalName?: string | null } | null;
  },
  score: number,
  options: { keepOriginalTitle?: boolean } = {},
): AssistantValidatedBook {
  const finiteNumber = (value: unknown): number | null => {
    if (value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const languageLabels: Record<string, string> = {
    vi: "Tiếng Việt",
    en: "Tiếng Anh",
    fr: "Tiếng Pháp",
    de: "Tiếng Đức",
    es: "Tiếng Tây Ban Nha",
  };
  return {
    id: book.id,
    title: options.keepOriginalTitle ? book.title : getVietnameseBookTitle(book.id, book.title),
    author: book.authorName,
    // Không đẩy mô tả ngoại ngữ vào câu trả lời tiếng Việt. Nếu chưa có bản
    // Việt hóa, trợ lý nói rõ là thiếu dữ liệu thay vì trộn ngôn ngữ.
    description: book.languageCode && book.languageCode !== "vi" ? null : book.description,
    score: Number.isFinite(score) ? score : 0,
    href: `/book/${book.id}`,
    price: finiteNumber(book.price),
    pages: book.pages ?? null,
    publishYear: book.publishYear ?? null,
    language: book.languageCode ? (languageLabels[book.languageCode] ?? book.languageCode) : null,
    category: book.category?.canonicalName ?? book.category?.name ?? null,
    rating: finiteNumber(book.rating),
  };
}

async function keywordSearchBooks(query: string, take = 5): Promise<AssistantValidatedBook[]> {
  const requestedLanguage = inferAssistantRequestedLanguage(query);
  const books = await prisma.book.findMany({
    where: {
      ...publicBookQualityWhere(),
      ...(requestedLanguage ? { languageCode: requestedLanguage } : {}),
    },
    orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      authorName: true,
      description: true,
      languageCode: true,
      price: true,
      pages: true,
      publishYear: true,
      rating: true,
      category: { select: { name: true, canonicalName: true } },
    },
  });
  const candidates = books.map((book) => ({
    ...book,
    price: Number(book.price),
    rating: book.rating === null ? null : Number(book.rating),
    originalTitle: book.title,
    title: getVietnameseBookTitle(book.id, book.title),
    categoryName: book.category.canonicalName ?? book.category.name,
  }));
  // Ưu tiên bản ghi tiếng Việt hoặc sách đã có tiêu đề tiếng Việt do BookVerse
  // biên tập. Nếu nhóm ưu tiên không có kết quả đúng chủ đề, dùng tiêu đề gốc
  // đã xác minh trong catalog thay vì báo nhầm rằng kho sách không có sách.
  const filters = extractAssistantBookFilters(query);
  const preferredCandidates = requestedLanguage
    ? candidates
    : candidates.filter(
        (book) => book.languageCode === "vi" || hasVietnameseBookTitle(book.id),
      );
  const applyFilters = (items: typeof candidates) => items.filter((book) => {
    const price = Number(book.price);
    if (filters.maxPrice !== null && (!Number.isFinite(price) || price > filters.maxPrice)) return false;
    if (filters.maxPages !== null && (book.pages === null || book.pages > filters.maxPages)) return false;
    if (filters.minPublishYear !== null && (book.publishYear === null || book.publishYear < filters.minPublishYear)) return false;
    return true;
  });
  const rankCandidates = (items: typeof candidates) =>
    rankAssistantBooks(items, query).sort((left, right) => {
      const a = byCandidateId(items, left.id);
      const b = byCandidateId(items, right.id);
      if (filters.preferLowPrice) return Number(a?.price ?? Infinity) - Number(b?.price ?? Infinity);
      if (filters.preferShort) return (a?.pages ?? Infinity) - (b?.pages ?? Infinity);
      return right.score - left.score;
    });
  let displayableCandidates = applyFilters(preferredCandidates);
  let ranked = rankCandidates(displayableCandidates);
  if (ranked.length === 0 && !requestedLanguage) {
    displayableCandidates = applyFilters(candidates);
    ranked = rankCandidates(displayableCandidates);
  }
  ranked = ranked.slice(0, take);
  const byId = new Map(books.map((book) => [book.id, book]));
  return ranked.flatMap((item) => {
    const book = byId.get(item.id);
    return book ? [mapBook(book, Math.min(1, item.score / 150), { keepOriginalTitle: requestedLanguage === "en" })] : [];
  });
}

function byCandidateId<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

async function findRankedBooks(
  kind: AssistantBookRankingKind,
  take = 5,
): Promise<AssistantValidatedBook[]> {
  const publicVietnameseWhere = { ...publicBookQualityWhere(), languageCode: "vi" };
  let rankedIds: string[] = [];

  if (kind === "BEST_SELLING") {
    const rows = await prisma.orderItem.groupBy({
      by: ["bookId"],
      where: {
        order: { status: { in: ["PAID", "PAID_DEMO", "SHIPPED", "COMPLETED"] } },
        book: publicVietnameseWhere,
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take,
    });
    rankedIds = rows.map((row) => row.bookId);
  } else if (kind === "MOST_READ") {
    const rows = await prisma.readingProgress.groupBy({
      by: ["bookId"],
      where: { progressPercent: { gt: 0 }, book: publicVietnameseWhere },
      _count: { userId: true },
      orderBy: { _count: { userId: "desc" } },
      take,
    });
    rankedIds = rows.map((row) => row.bookId);
  } else {
    const rows = await prisma.book.findMany({
      where: {
        ...publicVietnameseWhere,
        sourceMetadata: {
          is: {
            sourceRatingAverage: { not: null },
            sourceRatingCount: { gte: 5 },
          },
        },
      },
      orderBy: [
        { sourceMetadata: { sourceRatingAverage: { sort: "desc", nulls: "last" } } },
        { sourceMetadata: { sourceRatingCount: { sort: "desc", nulls: "last" } } },
        { id: "asc" },
      ],
      take,
      select: { id: true },
    });
    rankedIds = rows.map((row) => row.id);
  }

  if (rankedIds.length === 0) return [];
  const books = await prisma.book.findMany({
    where: { ...publicVietnameseWhere, id: { in: rankedIds } },
    select: { id: true, title: true, authorName: true, description: true, languageCode: true, price: true, pages: true, publishYear: true, rating: true, category: { select: { name: true, canonicalName: true } } },
  });
  const byId = new Map(books.map((book) => [book.id, book]));
  return rankedIds.flatMap((id, index) => {
    const book = byId.get(id);
    return book ? [mapBook(book, Math.max(0, 1 - index * 0.1))] : [];
  });
}

function providerTimeoutSignal(): AbortSignal {
  return AbortSignal.timeout(getAssistantTimeoutMs(process.env.BOOKVERSE_CHAT_TIMEOUT_MS));
}

async function createOpenAiEmbedding(input: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
      input,
    }),
    signal: providerTimeoutSignal(),
  });
  if (!response.ok) throw new Error(`OpenAI embedding trả về HTTP ${response.status}.`);
  const payload = (await response.json()) as { data?: Array<{ embedding?: number[] }> };
  return payload.data?.[0]?.embedding ?? null;
}

async function createGeminiEmbedding(input: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.GEMINI_EMBEDDING_MODEL ?? "text-embedding-004";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:embedContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { parts: [{ text: input }] } }),
      signal: providerTimeoutSignal(),
    },
  );
  if (!response.ok) throw new Error(`Gemini embedding trả về HTTP ${response.status}.`);
  const payload = (await response.json()) as { embedding?: { values?: number[] } };
  return payload.embedding?.values ?? null;
}

async function createQueryEmbedding(input: string): Promise<number[] | null> {
  const configured = process.env.BOOKVERSE_EMBEDDING_PROVIDER?.toLowerCase();
  if (configured === "gemini") return createGeminiEmbedding(input);
  if (configured === "openai") return createOpenAiEmbedding(input);
  if (process.env.OPENAI_API_KEY) return createOpenAiEmbedding(input);
  if (process.env.GEMINI_API_KEY) return createGeminiEmbedding(input);
  return null;
}

function toVectorLiteral(embedding: number[]): string {
  if (embedding.length === 0 || embedding.some((value) => !Number.isFinite(value))) {
    throw new Error("Embedding truy vấn không hợp lệ.");
  }
  return `[${embedding.map((value) => Number(value).toFixed(8)).join(",")}]`;
}

async function findRelevantBooks(query: string): Promise<RetrievalResult> {
  const title = extractQuotedBookTitle(query);
  if (title) {
    const exactBooks = await prisma.book.findMany({
      where: { ...publicBookQualityWhere(), title: { equals: title, mode: "insensitive" } },
      take: 5,
      select: { id: true, title: true, authorName: true, description: true, languageCode: true, price: true, pages: true, publishYear: true, rating: true, category: { select: { name: true, canonicalName: true } } },
    });
    if (exactBooks.length > 0) {
      return { books: exactBooks.map((book) => mapBook(book, 1)), source: "keyword", degraded: false, errorCode: null };
    }
  }
  try {
    const requestedLanguage = inferAssistantRequestedLanguage(query);
    const retrievalLanguage = requestedLanguage;
    const embedding = await createQueryEmbedding(query);
    if (!embedding) {
      return {
        books: await keywordSearchBooks(query),
        source: "keyword",
        degraded: true,
        errorCode: "EMBEDDING_UNAVAILABLE",
      };
    }

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        title: string;
        authorName: string;
        description: string | null;
        languageCode: string | null;
        score: number;
      }>
    >(
      `
      SELECT
        b."id",
        b."title",
        b."authorName",
        b."description",
        b."languageCode",
        1 - (be."embedding" <=> $1::vector) AS "score"
      FROM "book_embeddings" be
      INNER JOIN "Book" b ON b."id" = be."bookId"
      WHERE b."status" = 'ACTIVE'
        AND ($2::text IS NULL OR b."languageCode" = $2)
      ORDER BY be."embedding" <=> $1::vector
      LIMIT 5
      `,
      toVectorLiteral(embedding),
      retrievalLanguage,
    );

    const displayableRows = requestedLanguage
      ? rows
      : rows.filter(
          (row) => row.languageCode === "vi" || hasVietnameseBookTitle(row.id),
        );
    if (displayableRows.length > 0) {
      return {
        books: displayableRows.map((row) => mapBook(row, Number(row.score), { keepOriginalTitle: requestedLanguage === "en" })),
        source: "vector",
        degraded: false,
        errorCode: null,
      };
    }
    return {
      books: await keywordSearchBooks(query),
      source: "keyword",
      degraded: true,
      errorCode: "VECTOR_CONTEXT_UNAVAILABLE",
    };
  } catch (error: unknown) {
    console.error(`[assistant/rag] Chuyển sang keyword: ${sanitizeAssistantLog(error)}`);
    return {
      books: await keywordSearchBooks(query),
      source: "keyword",
      degraded: true,
      errorCode: "EMBEDDING_UNAVAILABLE",
    };
  }
}

async function getAssistantStoreContext(): Promise<AssistantStoreContext> {
  const publicWhere = publicBookQualityWhere();
  const [activeBooks, readableBooks, categories, activePlans, approvedListings] =
    await Promise.all([
      prisma.book.count({ where: publicWhere }),
      prisma.book.count({
        where: {
          ...publicWhere,
          chunks: { some: {} },
        },
      }),
      prisma.category.count({
        where: {
          books: { some: publicWhere },
        },
      }),
      prisma.membershipPlan.count({ where: { isActive: true } }),
      prisma.listing.count({
        where: {
          status: "APPROVED",
          stock: { gt: 0 },
          book: { is: publicWhere },
        },
      }),
    ]);

  return { activeBooks, readableBooks, categories, activePlans, approvedListings };
}

async function getAssistantAccountContext(
  currentUser: CurrentUserSession | null,
): Promise<AssistantAccountContext> {
  if (!currentUser || currentUser.isLocked) {
    return {
      authenticated: false,
      displayName: null,
      role: null,
      membership: null,
      cartItemCount: 0,
      orderCount: 0,
      readingBooks: 0,
      completedBooks: 0,
    };
  }

  const [membership, cart, orderCount, readingBooks, completedBooks] =
    await Promise.all([
      prisma.subscription.findFirst({
        where: {
          userId: currentUser.id,
          status: "ACTIVE",
          endsAt: { gt: new Date() },
        },
        orderBy: { endsAt: "desc" },
        select: {
          endsAt: true,
          plan: { select: { name: true } },
        },
      }),
      prisma.order.findFirst({
        where: {
          buyerId: currentUser.id,
          status: "PENDING",
          paymentMethod: null,
        },
        orderBy: { updatedAt: "desc" },
        select: {
          items: { select: { quantity: true } },
        },
      }),
      prisma.order.count({
        where: {
          buyerId: currentUser.id,
          NOT: { status: "PENDING", paymentMethod: null },
        },
      }),
      prisma.readingProgress.count({ where: { userId: currentUser.id } }),
      prisma.readingProgress.count({
        where: { userId: currentUser.id, progressPercent: { gte: 99 } },
      }),
    ]);

  return {
    authenticated: true,
    displayName: currentUser.name ?? null,
    role: currentUser.role,
    membership: {
      active: Boolean(membership),
      planName: membership?.plan.name ?? null,
      endsAt: membership?.endsAt ?? null,
    },
    cartItemCount:
      cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0,
    orderCount,
    readingBooks,
    completedBooks,
  };
}

function resolveProvider(): AssistantProvider {
  if (
    isDevelopmentMockEnabled(process.env.NODE_ENV, process.env.BOOKVERSE_CHAT_MOCK_ENABLED)
  ) {
    return "mock";
  }
  const configured = process.env.BOOKVERSE_LLM_PROVIDER?.toLowerCase();
  if (configured === "local") return "local";
  if (configured === "openai") return process.env.OPENAI_API_KEY ? "openai" : "local";
  if (configured === "gemini") return process.env.GEMINI_API_KEY ? "gemini" : "local";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return "local";
}

async function callOpenAi(
  messages: ChatMessageForLlm[],
  systemPrompt: string,
): Promise<{ answer: string; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI provider chưa được cấu hình.");
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.45,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
    signal: providerTimeoutSignal(),
  });
  if (!response.ok) throw new Error(`OpenAI trả về HTTP ${response.status}.`);
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const answer = payload.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error("OpenAI không trả nội dung phản hồi.");
  return { answer, model };
}

async function callGemini(
  messages: ChatMessageForLlm[],
  systemPrompt: string,
): Promise<{ answer: string; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini provider chưa được cấu hình.");
  const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: messages.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        generationConfig: { temperature: 0.45 },
      }),
      signal: providerTimeoutSignal(),
    },
  );
  if (!response.ok) throw new Error(`Gemini trả về HTTP ${response.status}.`);
  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const answer = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!answer) throw new Error("Gemini không trả nội dung phản hồi.");
  return { answer, model };
}

async function resolveReply(
  message: string,
  messages: ChatMessageForLlm[],
  books: AssistantValidatedBook[],
  grounding: AssistantGroundingContext,
): Promise<ReplyResult> {
  // Câu hỏi xếp hạng đã có phép tính và nguồn dữ liệu xác định ở phía máy chủ.
  // Trả lời theo mẫu cố định để nhà cung cấp AI không đổi thứ tự hoặc thêm sách.
  if (grounding.rankingKind) {
    return {
      provider: "local",
      model: "local-bookverse-ranking-v1",
      answer: buildGroundedLocalAnswer(message, books, grounding),
      mocked: false,
      degraded: false,
      errorCode: null,
    };
  }
  const provider = resolveProvider();
  if (provider === "mock") {
    return {
      provider,
      model: "development-mock",
      answer: buildDevelopmentMockAnswer(message, books),
      mocked: true,
      degraded: true,
      errorCode: "MOCK_ENABLED",
    };
  }
  if (provider === "local") {
    return {
      provider,
      model: "local-bookverse-knowledge-v4",
      answer: buildGroundedLocalAnswer(message, books, grounding),
      mocked: false,
      degraded: true,
      errorCode: "AI_PROVIDER_UNAVAILABLE",
    };
  }

  return runWithAssistantFallback<ReplyResult>(
    async () => {
      const result =
        provider === "openai"
          ? await callOpenAi(messages, buildSystemPrompt(books, grounding))
          : await callGemini(messages, buildSystemPrompt(books, grounding));
      return {
        provider,
        model: result.model,
        answer: result.answer,
        mocked: false,
        degraded: false,
        errorCode: null,
      } satisfies ReplyResult;
    },
    (error) => {
      console.error(`[assistant/provider] Dùng local fallback: ${sanitizeAssistantLog(error)}`);
      return {
        provider: "local",
        model: "local-bookverse-knowledge-v4",
        answer: buildGroundedLocalAnswer(message, books, grounding),
        mocked: false,
        degraded: true,
        errorCode: "AI_PROVIDER_UNAVAILABLE",
      } satisfies ReplyResult;
    },
  );
}

async function createOrContinueSession(input: AssistantServiceInput) {
  const currentUserId = input.currentUser?.id ?? null;
  const requestedSessionId = selectRequestedSessionId(currentUserId, input.sessionId);
  const lockedCode = evaluateSessionAccess({
    currentUserId,
    currentUserLocked: input.currentUser?.isLocked ?? false,
  });
  if (lockedCode) throw failureForAccess(lockedCode);

  // Ghi lồng nhau vẫn nguyên tử, không giữ một giao dịch tương tác qua nhiều
  // lượt gọi JavaScript (dễ hết thời gian chờ khi máy chủ tải lại mã).
    let session: { id: string; userId: string | null } | null = null;
    if (requestedSessionId) {
      session = await prisma.chatbotSession.findUnique({
        where: { id: requestedSessionId },
        select: { id: true, userId: true },
      });
      const accessCode = evaluateSessionAccess({
        currentUserId,
        currentUserLocked: false,
        requestedSessionId,
        sessionExists: Boolean(session),
        sessionUserId: session?.userId,
      });
      if (accessCode) throw failureForAccess(accessCode);
    }

    const userMessage = {
      role: ChatbotMessageRole.USER,
      content: input.message,
      metadata: { source: "assistant_contract", contractVersion: ASSISTANT_CONTRACT_VERSION },
    };
    if (session) {
      return prisma.chatbotSession.update({
        where: { id: session.id, userId: currentUserId },
        data: { messages: { create: userMessage } },
        select: { id: true, userId: true },
      });
    }
    return prisma.chatbotSession.create({
        data: {
          userId: currentUserId,
          title: input.message.slice(0, 80),
          metadata: { source: "assistant_contract", contractVersion: ASSISTANT_CONTRACT_VERSION },
          messages: { create: userMessage },
        },
        select: { id: true, userId: true },
      });
}

export async function runAssistantMessage(
  input: AssistantServiceInput,
): Promise<AssistantSuccessResponse> {
  const session = await createOrContinueSession(input);
  const followUp = Boolean(input.focusedBookId) || isBookContextFollowUp(input.message);
  const wantsAlternatives = isAlternativeBookRequest(input.message);
  const rankingKind = detectAssistantBookRanking(input.message);
  const intent = followUp || wantsAlternatives ? "DISCOVERY" : classifyBookVerseIntent(input.message);
  const knowledge = retrieveBookVerseKnowledge(input.message);
  const needsBooks = followUp || Boolean(extractQuotedBookTitle(input.message)) || shouldRetrieveBooks(input.message, intent)
    || /^(tom tat|gioi thieu)\b/.test(input.message.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
  const recentMessagesPromise = prisma.chatbotMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
  const recentMessages = await recentMessagesPromise;
  const previousUserQueries = recentMessages
    .filter((message) => message.role === ChatbotMessageRole.USER)
    .slice(1)
    .map((message) => message.content);
  const contextSeedQuery = input.contextQuery ?? previousUserQueries.find(
    (query) => !isBookContextFollowUp(query) && !isAlternativeBookRequest(query),
  );
  // ID từ khách chỉ là gợi ý công khai, luôn truy vấn lại theo chính sách hiển thị.
  // Không cho khách đọc lịch sử của phiên khác để giữ ngữ cảnh.
  const lastAssistant = recentMessages.find((message) => message.role === ChatbotMessageRole.ASSISTANT);
  const metadata = lastAssistant?.metadata as { ragBookIds?: unknown } | null;
  const savedIds = Array.isArray(metadata?.ragBookIds) ? metadata.ragBookIds.filter((id): id is string => typeof id === "string") : [];
  const contextIds = input.focusedBookId
    ? [input.focusedBookId]
    : wantsAlternatives
      ? (input.contextBookIds ?? savedIds).slice(0, 5)
      : selectContextBookIds(input.message, input.contextBookIds ?? savedIds);
  const contextBooks = contextIds.length ? await prisma.book.findMany({
    where: { ...publicBookQualityWhere(), id: { in: contextIds } },
    select: { id: true, title: true, authorName: true, description: true, languageCode: true, price: true, pages: true, publishYear: true, rating: true, category: { select: { name: true, canonicalName: true } } },
  }) : [];
  const orderedContextBooks = contextIds.flatMap((id) => {
    const book = contextBooks.find((item) => item.id === id);
    return book ? [mapBook(book, 1)] : [];
  });
  const retrievalQuery = buildAssistantRetrievalQuery(
    input.message,
    // Lượt hiện tại vừa được lưu khi tạo/tiếp tục session nên danh sách này
    // chỉ còn các câu trước đó, mới nhất đứng trước.
    previousUserQueries,
  );
  const needsStoreContext = intent === "CATALOG";
  const needsAccountContext =
    queryWantsAccountData(input.message) &&
    ["MEMBERSHIP", "ORDERS", "ACCOUNT", "READING"].includes(intent);
  const [retrieval, store, account] = await Promise.all([
    rankingKind
      ? findRankedBooks(rankingKind).then((books) => ({
          books,
          source: "keyword" as const,
          degraded: false,
          errorCode: null,
        }))
      : wantsAlternatives && contextSeedQuery
      ? keywordSearchBooks(contextSeedQuery, 10).then((books) => ({
          books: books.filter((book) => !contextIds.includes(book.id)).slice(0, 5),
          source: "keyword" as const,
          degraded: false,
          errorCode: null,
        }))
      : followUp
      ? Promise.resolve<RetrievalResult>({ books: orderedContextBooks, source: "keyword", degraded: false, errorCode: null })
      : needsBooks
      ? findRelevantBooks(retrievalQuery)
      : Promise.resolve<RetrievalResult>({
          books: [],
          source: "keyword",
          degraded: false,
          errorCode: null,
        }),
    needsStoreContext
      ? getAssistantStoreContext()
      : Promise.resolve(EMPTY_STORE_CONTEXT),
    needsAccountContext
      ? getAssistantAccountContext(input.currentUser)
      : Promise.resolve(EMPTY_ACCOUNT_CONTEXT),
  ]);
  const messages: ChatMessageForLlm[] = recentMessages
    .reverse()
    .filter((message) => message.role !== ChatbotMessageRole.SYSTEM)
    .map((message) => ({
      role: message.role === ChatbotMessageRole.ASSISTANT ? "assistant" : "user",
      content: message.content,
    }));

  const grounding: AssistantGroundingContext = {
    intent,
    knowledge,
    store,
    account,
    rankingKind,
  };
  const focusedContentReply = await getFocusedBookContentReply(
    input,
    Boolean(input.focusedBookId && orderedContextBooks.length > 0),
  );
  const reply =
    focusedContentReply ??
    (await resolveReply(input.message, messages, retrieval.books, grounding));
  const degraded = retrieval.degraded || reply.degraded;
  const errorCode = reply.errorCode ?? retrieval.errorCode;

  const assistantMessageId = crypto.randomUUID();
  await prisma.chatbotSession.update({
      where: { id: session.id },
      data: {
        messages: { create: {
        id: assistantMessageId,
        role: ChatbotMessageRole.ASSISTANT,
        content: reply.answer,
        metadata: {
          source: retrieval.source,
          provider: reply.provider,
          model: reply.model,
          mocked: reply.mocked,
          degraded,
          errorCode,
          contractVersion: ASSISTANT_CONTRACT_VERSION,
          ragBookIds: retrieval.books.map((book) => book.id),
          knowledgeArticleIds: knowledge.map((article) => article.id),
          intent,
          accountContextUsed: account.authenticated,
        },
        } },
        metadata: {
          source: "assistant_contract",
          contractVersion: ASSISTANT_CONTRACT_VERSION,
          lastProvider: reply.provider,
          lastModel: reply.model,
          lastRetrievalSource: retrieval.source,
          mocked: reply.mocked,
          degraded,
          errorCode,
          lastRagBookIds: retrieval.books.map((book) => book.id),
          lastKnowledgeArticleIds: knowledge.map((article) => article.id),
          lastIntent: intent,
          accountContextUsed: account.authenticated,
        },
      },
    });

  return {
    success: true,
    contractVersion: ASSISTANT_CONTRACT_VERSION,
    answer: reply.answer,
    validatedBooks: retrieval.books,
    provider: reply.provider,
    model: reply.model,
    source: retrieval.source,
    mocked: reply.mocked,
    degraded,
    sessionId: session.id,
    assistantMessageId,
    errorCode,
  };
}
