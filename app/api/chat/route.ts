import { ChatbotMessageRole, type Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";

const SYSTEM_PROMPT =
  "Bạn là Trợ lý AI của nhà sách BookVerse. Hãy tư vấn sách ngắn gọn, chuyên nghiệp và thân thiện.";

type LlmProvider = "openai" | "gemini" | "mock";

interface ChatRequestBody {
  message?: string;
  sessionId?: string;
}

interface LlmReply {
  provider: LlmProvider;
  model: string;
  content: string;
  mocked: boolean;
}

interface RagBook {
  id: string;
  title: string;
  author: string;
  description: string | null;
  score: number;
}

interface ChatApiResponse {
  success: true;
  sessionId: string;
  assistantMessageId: string;
  reply: string;
  provider: LlmProvider;
  model: string;
  mocked: boolean;
  contextBooks: Array<{
    id: string;
    title: string;
    author: string;
    score: number;
  }>;
}

interface ChatMessageForLlm {
  role: "user" | "assistant";
  content: string;
}

function isChatRequestBody(value: unknown): value is ChatRequestBody {
  if (!value || typeof value !== "object") {
    return false;
  }

  const body = value as ChatRequestBody;

  return (
    (typeof body.message === "string" || typeof body.message === "undefined") &&
    (typeof body.sessionId === "string" || typeof body.sessionId === "undefined")
  );
}

function buildMockReply(message: string, contextBooks: RagBook[] = []): string {
  if (contextBooks.length > 0) {
    const bookList = contextBooks
      .slice(0, 3)
      .map((book) => `${book.title} của ${book.author}`)
      .join("; ");

    return `Dựa trên kho sách BookVerse, bạn nên xem: ${bookList}. Mình ưu tiên các sách này vì nội dung khớp với nhu cầu bạn vừa hỏi.`;
  }

  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("kinh doanh") || normalizedMessage.includes("startup")) {
    return "Bạn nên bắt đầu với sách kinh doanh nền tảng, ưu tiên các cuốn có ví dụ thực tế và review tốt từ cộng đồng BookVerse.";
  }

  if (normalizedMessage.includes("ai") || normalizedMessage.includes("công nghệ")) {
    return "Mình gợi ý nhóm sách về AI, dữ liệu và tư duy sản phẩm công nghệ. Hãy chọn sách có mức nhập môn nếu bạn mới bắt đầu.";
  }

  if (normalizedMessage.includes("sách cũ") || normalizedMessage.includes("giá rẻ")) {
    return "Bạn có thể vào Chợ sách cũ, lọc tình trạng GOOD hoặc LIKE_NEW và ưu tiên người bán có AI Score cao.";
  }

  return "Mình đã ghi nhận nhu cầu đọc của bạn. Bạn có thể nói rõ thể loại, ngân sách hoặc mục tiêu học để mình gợi ý sát hơn.";
}

function buildSystemPrompt(contextBooks: RagBook[]): string {
  if (contextBooks.length === 0) {
    return SYSTEM_PROMPT;
  }

  const context = contextBooks
    .map(
      (book, index) =>
        `${index + 1}. ${book.title}\nTác giả: ${book.author}\nĐiểm phù hợp: ${book.score.toFixed(
          3,
        )}\nMô tả: ${book.description ?? "Chưa có mô tả."}`,
    )
    .join("\n\n");

  return `${SYSTEM_PROMPT}

Ngữ cảnh kho sách BookVerse liên quan nhất tới câu hỏi:
${context}

Chỉ tư vấn dựa trên các sách trong ngữ cảnh nếu phù hợp. Nếu thiếu dữ liệu, hãy nói rõ và gợi ý người dùng cung cấp thêm thể loại, ngân sách hoặc mục tiêu đọc.`;
}

function resolveProvider(): LlmProvider {
  const configuredProvider = process.env.BOOKVERSE_LLM_PROVIDER?.toLowerCase();

  if (configuredProvider === "openai" || configuredProvider === "gemini") {
    return configuredProvider;
  }

  if (process.env.OPENAI_API_KEY) {
    return "openai";
  }

  if (process.env.GEMINI_API_KEY) {
    return "gemini";
  }

  return "mock";
}

async function createOpenAiEmbedding(input: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
      input,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI embedding trả về HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as {
    data?: Array<{
      embedding?: number[];
    }>;
  };

  return payload.data?.[0]?.embedding ?? null;
}

async function createGeminiEmbedding(input: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const model = process.env.GEMINI_EMBEDDING_MODEL ?? "text-embedding-004";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:embedContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: {
          parts: [{ text: input }],
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini embedding trả về HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as {
    embedding?: {
      values?: number[];
    };
  };

  return payload.embedding?.values ?? null;
}

async function createQueryEmbedding(input: string): Promise<number[] | null> {
  const provider = process.env.BOOKVERSE_EMBEDDING_PROVIDER?.toLowerCase();

  if (provider === "gemini") {
    return createGeminiEmbedding(input);
  }

  if (provider === "openai" || process.env.OPENAI_API_KEY) {
    return createOpenAiEmbedding(input);
  }

  if (process.env.GEMINI_API_KEY) {
    return createGeminiEmbedding(input);
  }

  return null;
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.map((value) => Number(value).toFixed(8)).join(",")}]`;
}

async function keywordSearchBooks(query: string, take = 5): Promise<RagBook[]> {
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
    "ý",
  ]);
  const normalizedTerms = query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => (term === "ai" || term.length >= 3) && !stopWords.has(term));
  const searchValues = Array.from(new Set([query, ...normalizedTerms])).filter(Boolean);
  const searchFilters: Prisma.BookWhereInput[] = searchValues.flatMap((value) => [
    {
      title: {
        contains: value,
        mode: "insensitive",
      },
    },
    {
      authorName: {
        contains: value,
        mode: "insensitive",
      },
    },
    {
      description: {
        contains: value,
        mode: "insensitive",
      },
    },
    {
      category: {
        name: {
          contains: value,
          mode: "insensitive",
        },
      },
    },
  ]);

  const books = await prisma.book.findMany({
    where: searchFilters.length > 0 ? { OR: searchFilters } : undefined,
    take,
    orderBy: [
      {
        rating: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    select: {
      id: true,
      title: true,
      authorName: true,
      description: true,
    },
  });

  const fallbackBooks =
    books.length > 0
      ? books
      : await prisma.book.findMany({
          take,
          orderBy: [
            {
              rating: "desc",
            },
            {
              createdAt: "desc",
            },
          ],
          select: {
            id: true,
            title: true,
            authorName: true,
            description: true,
          },
        });

  return fallbackBooks.map((book, index) => ({
    id: book.id,
    title: book.title,
    author: book.authorName,
    description: book.description,
    score: Math.max(0.1, 0.75 - index * 0.08),
  }));
}

async function findRelevantBooks(query: string): Promise<RagBook[]> {
  try {
    const embedding = await createQueryEmbedding(query);

    if (!embedding) {
      return keywordSearchBooks(query);
    }

    const vectorLiteral = toVectorLiteral(embedding);
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        title: string;
        author: string;
        description: string | null;
        score: number;
      }>
    >(
      `
      SELECT
        b."id",
        b."title",
        b."authorName" AS "author",
        b."description",
        1 - (be."embedding" <=> $1::vector) AS "score"
      FROM "book_embeddings" be
      INNER JOIN "Book" b ON b."id" = be."bookId"
      ORDER BY be."embedding" <=> $1::vector
      LIMIT 5
      `,
      vectorLiteral,
    );

    if (rows.length > 0) {
      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        author: row.author,
        description: row.description,
        score: Number(row.score),
      }));
    }

    return keywordSearchBooks(query);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[api/chat/rag] Fallback keyword search: ${message}`);
    return keywordSearchBooks(query);
  }
}

async function callOpenAi(messages: ChatMessageForLlm[], systemPrompt: string): Promise<LlmReply> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  if (!apiKey) {
    return {
      provider: "mock",
      model: "mock",
      content: buildMockReply(messages.at(-1)?.content ?? ""),
      mocked: true,
    };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.45,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...messages,
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI trả về HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("OpenAI không trả nội dung phản hồi.");
  }

  return {
    provider: "openai",
    model,
    content,
    mocked: false,
  };
}

async function callGemini(messages: ChatMessageForLlm[], systemPrompt: string): Promise<LlmReply> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";

  if (!apiKey) {
    return {
      provider: "mock",
      model: "mock",
      content: buildMockReply(messages.at(-1)?.content ?? ""),
      mocked: true,
    };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: messages.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          temperature: 0.45,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini trả về HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };
  const content = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!content) {
    throw new Error("Gemini không trả nội dung phản hồi.");
  }

  return {
    provider: "gemini",
    model,
    content,
    mocked: false,
  };
}

async function callLlm(
  messages: ChatMessageForLlm[],
  systemPrompt: string,
  contextBooks: RagBook[],
): Promise<LlmReply> {
  const provider = resolveProvider();

  if (provider === "openai") {
    return callOpenAi(messages, systemPrompt);
  }

  if (provider === "gemini") {
    return callGemini(messages, systemPrompt);
  }

  return {
    provider: "mock",
    model: "mock",
    content: buildMockReply(messages.at(-1)?.content ?? "", contextBooks),
    mocked: true,
  };
}

function buildStreamResponse(payload: ChatApiResponse): Response {
  const encoder = new TextEncoder();
  const chunks = payload.reply.match(/.{1,42}(\s|$)/g) ?? [payload.reply];

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          `event: meta\ndata: ${JSON.stringify({
            sessionId: payload.sessionId,
            assistantMessageId: payload.assistantMessageId,
            provider: payload.provider,
            model: payload.model,
            mocked: payload.mocked,
            contextBooks: payload.contextBooks,
          })}\n\n`,
        ),
      );

      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(`event: token\ndata: ${JSON.stringify({ token: chunk })}\n\n`));
      }

      controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ ok: true })}\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/event-stream; charset=utf-8",
    },
  });
}

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json().catch(() => null);

    if (!isChatRequestBody(payload) || !payload.message?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Vui lòng nhập nội dung cần tư vấn.",
        },
        {
          status: 400,
        },
      );
    }

    const currentUser = await getCurrentUser();

    if (currentUser?.isLocked) {
      return NextResponse.json(
        {
          success: false,
          error: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.",
        },
        {
          status: 403,
        },
      );
    }

    const userId = currentUser?.id ?? null;
    const cleanMessage = payload.message.trim();
    const requestedSessionId = userId ? payload.sessionId?.trim() : undefined;

    const chatSession = await prisma.$transaction(async (tx) => {
      const existingSession = requestedSessionId
        ? await tx.chatbotSession.findFirst({
            where: {
              id: requestedSessionId,
              userId,
            },
          })
        : null;

      const nextSession =
        existingSession ??
        (await tx.chatbotSession.create({
          data: {
            userId,
            title: cleanMessage.slice(0, 80),
            metadata: {
              source: "floating_chatbot",
            },
          },
        }));

      await tx.chatbotMessage.create({
        data: {
          sessionId: nextSession.id,
          role: ChatbotMessageRole.USER,
          content: cleanMessage,
          metadata: {
            source: "floating_chatbot",
          },
        },
      });

      return nextSession;
    });

    const recentMessages = await prisma.chatbotMessage.findMany({
      where: {
        sessionId: chatSession.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    });
    const llmMessages: ChatMessageForLlm[] = recentMessages
      .reverse()
      .filter((message) => message.role !== ChatbotMessageRole.SYSTEM)
      .map((message) => ({
        role: message.role === ChatbotMessageRole.ASSISTANT ? "assistant" : "user",
        content: message.content,
      }));
    const contextBooks = await findRelevantBooks(cleanMessage);
    const systemPrompt = buildSystemPrompt(contextBooks);

    const llmReply = await callLlm(llmMessages, systemPrompt, contextBooks);

    const assistantMessage = await prisma.$transaction(async (tx) => {
      const createdMessage = await tx.chatbotMessage.create({
        data: {
          sessionId: chatSession.id,
          role: ChatbotMessageRole.ASSISTANT,
          content: llmReply.content,
          metadata: {
            provider: llmReply.provider,
            model: llmReply.model,
            mocked: llmReply.mocked,
            ragBookIds: contextBooks.map((book) => book.id),
          },
        },
      });

      await tx.chatbotSession.update({
        where: {
          id: chatSession.id,
        },
        data: {
          metadata: {
            source: "floating_chatbot",
            lastProvider: llmReply.provider,
            lastModel: llmReply.model,
            mocked: llmReply.mocked,
            lastRagBookIds: contextBooks.map((book) => book.id),
          },
        },
      });

      return createdMessage;
    });

    const responsePayload: ChatApiResponse = {
      success: true,
      sessionId: chatSession.id,
      assistantMessageId: assistantMessage.id,
      reply: llmReply.content,
      provider: llmReply.provider,
      model: llmReply.model,
      mocked: llmReply.mocked,
      contextBooks: contextBooks.map((book) => ({
        id: book.id,
        title: book.title,
        author: book.author,
        score: book.score,
      })),
    };
    const requestUrl = new URL(request.url);
    const wantsStream =
      requestUrl.searchParams.get("stream") === "1" ||
      request.headers.get("accept")?.includes("text/event-stream");

    if (wantsStream) {
      return buildStreamResponse(responsePayload);
    }

    return NextResponse.json(responsePayload, {
      status: 200,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[api/chat] ${message}`);

    return NextResponse.json(
      {
        success: false,
        error: "Không thể xử lý trợ lý AI lúc này.",
        detail: process.env.NODE_ENV === "development" ? message : undefined,
      },
      {
        status: 500,
      },
    );
  }
}
