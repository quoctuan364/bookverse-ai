import { BookStatus, ChatbotMessageRole, type Prisma } from "@prisma/client";

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
import type { CurrentUserSession } from "@/lib/permissions";
import prisma from "@/lib/prisma";

const SYSTEM_PROMPT = `Bạn là Trợ lý AI của nhà sách BookVerse.
Hãy tư vấn ngắn gọn, chuyên nghiệp và thân thiện.
Chỉ nhắc đến sách có trong ngữ cảnh đã xác minh. Không tự tạo mã sách, giá hoặc đường dẫn.`;

interface AssistantServiceInput {
  message: string;
  sessionId?: string;
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

function buildSystemPrompt(books: AssistantValidatedBook[]): string {
  if (books.length === 0) return SYSTEM_PROMPT;
  const context = books
    .map(
      (book, index) =>
        `${index + 1}. ${book.title}\nTác giả: ${book.author}\nĐiểm phù hợp: ${book.score.toFixed(
          3,
        )}\nMô tả: ${book.description ?? "Chưa có mô tả."}`,
    )
    .join("\n\n");
  return `${SYSTEM_PROMPT}\n\nNgữ cảnh kho sách BookVerse đã xác minh:\n${context}`;
}

function normalizedSearchTerms(query: string): string[] {
  const stopWords = new Set([
    "ban",
    "cho",
    "cuon",
    "cua",
    "doc",
    "goi",
    "hay",
    "minh",
    "moi",
    "mot",
    "nguoi",
    "sach",
    "toi",
    "tu",
    "van",
    "ve",
    "voi",
  ]);
  const terms = query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => (term === "ai" || term.length >= 3) && !stopWords.has(term));
  return Array.from(new Set([query, ...terms])).filter(Boolean);
}

function mapBook(
  book: { id: string; title: string; authorName: string; description: string | null },
  score: number,
): AssistantValidatedBook {
  return {
    id: book.id,
    title: book.title,
    author: book.authorName,
    description: book.description,
    score: Number.isFinite(score) ? score : 0,
    href: `/book/${book.id}`,
  };
}

async function keywordSearchBooks(query: string, take = 5): Promise<AssistantValidatedBook[]> {
  const searchFilters: Prisma.BookWhereInput[] = normalizedSearchTerms(query).flatMap((value) => [
    { title: { contains: value, mode: "insensitive" } },
    { authorName: { contains: value, mode: "insensitive" } },
    { description: { contains: value, mode: "insensitive" } },
    { category: { name: { contains: value, mode: "insensitive" } } },
    { tags: { some: { name: { contains: value, mode: "insensitive" } } } },
  ]);

  const books = await prisma.book.findMany({
    where: {
      status: BookStatus.ACTIVE,
      ...(searchFilters.length > 0 ? { OR: searchFilters } : {}),
    },
    take,
    orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
    select: { id: true, title: true, authorName: true, description: true },
  });
  const fallbackBooks =
    books.length > 0
      ? books
      : await prisma.book.findMany({
          where: { status: BookStatus.ACTIVE },
          take,
          orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
          select: { id: true, title: true, authorName: true, description: true },
        });

  return fallbackBooks.map((book, index) => mapBook(book, Math.max(0.1, 0.75 - index * 0.08)));
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
  try {
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
        score: number;
      }>
    >(
      `
      SELECT
        b."id",
        b."title",
        b."authorName",
        b."description",
        1 - (be."embedding" <=> $1::vector) AS "score"
      FROM "book_embeddings" be
      INNER JOIN "Book" b ON b."id" = be."bookId"
      WHERE b."status" = 'ACTIVE'
      ORDER BY be."embedding" <=> $1::vector
      LIMIT 5
      `,
      toVectorLiteral(embedding),
    );

    if (rows.length > 0) {
      return {
        books: rows.map((row) => mapBook(row, Number(row.score))),
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
): Promise<ReplyResult> {
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
      model: "local-catalog-v1",
      answer: buildGroundedLocalAnswer(message, books),
      mocked: false,
      degraded: true,
      errorCode: "AI_PROVIDER_UNAVAILABLE",
    };
  }

  return runWithAssistantFallback<ReplyResult>(
    async () => {
      const result =
        provider === "openai"
          ? await callOpenAi(messages, buildSystemPrompt(books))
          : await callGemini(messages, buildSystemPrompt(books));
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
        model: "local-catalog-v1",
        answer: buildGroundedLocalAnswer(message, books),
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

  return prisma.$transaction(async (tx) => {
    let session: { id: string; userId: string | null } | null = null;
    if (requestedSessionId) {
      session = await tx.chatbotSession.findUnique({
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

    const nextSession =
      session ??
      (await tx.chatbotSession.create({
        data: {
          userId: currentUserId,
          title: input.message.slice(0, 80),
          metadata: { source: "assistant_contract", contractVersion: ASSISTANT_CONTRACT_VERSION },
        },
        select: { id: true, userId: true },
      }));

    await tx.chatbotMessage.create({
      data: {
        sessionId: nextSession.id,
        role: ChatbotMessageRole.USER,
        content: input.message,
        metadata: { source: "assistant_contract", contractVersion: ASSISTANT_CONTRACT_VERSION },
      },
    });
    return nextSession;
  });
}

export async function runAssistantMessage(
  input: AssistantServiceInput,
): Promise<AssistantSuccessResponse> {
  const session = await createOrContinueSession(input);
  const recentMessages = await prisma.chatbotMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  const messages: ChatMessageForLlm[] = recentMessages
    .reverse()
    .filter((message) => message.role !== ChatbotMessageRole.SYSTEM)
    .map((message) => ({
      role: message.role === ChatbotMessageRole.ASSISTANT ? "assistant" : "user",
      content: message.content,
    }));

  const retrieval = await findRelevantBooks(input.message);
  const reply = await resolveReply(input.message, messages, retrieval.books);
  const degraded = retrieval.degraded || reply.degraded;
  const errorCode = reply.errorCode ?? retrieval.errorCode;

  const assistantMessage = await prisma.$transaction(async (tx) => {
    const created = await tx.chatbotMessage.create({
      data: {
        sessionId: session.id,
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
        },
      },
    });
    await tx.chatbotSession.update({
      where: { id: session.id },
      data: {
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
        },
      },
    });
    return created;
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
    assistantMessageId: assistantMessage.id,
    errorCode,
  };
}
