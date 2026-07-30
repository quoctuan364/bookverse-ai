"use server";

import { getCurrentUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import {
  areReaderRagCitationsGrounded,
  buildLocalGroundedReaderAnswer,
  parseReaderRagCitations,
  rankReaderRagChunks,
  READER_RAG_NOT_FOUND,
  READER_RAG_SYSTEM_PROMPT,
  type ReaderRagChunk,
  type ReaderRagCitation,
} from "@/lib/reader-rag";

export interface ReaderRagActionResult {
  success: boolean;
  answer: string;
  citations: ReaderRagCitation[];
  provider: "openai" | "gemini" | "local";
  retrievedChunkCount: number;
  access: "FULL" | "PREVIEW";
  error?: string;
}

function providerTimeoutSignal(): AbortSignal {
  const configured = Number(process.env.BOOKVERSE_CHAT_TIMEOUT_MS ?? "12000");
  const timeoutMs = Number.isFinite(configured)
    ? Math.min(30_000, Math.max(2_000, configured))
    : 12_000;
  return AbortSignal.timeout(timeoutMs);
}

function buildChunkContext(chunks: ReaderRagChunk[]): string {
  return chunks
    .map(
      (chunk, index) =>
        `<BOOK_CHUNK index="${index + 1}" chapter="${chunk.chapterNumber}" page="${chunk.pageNumber ?? ""}" title="${chunk.chapterTitle}">\n${chunk.content}\n</BOOK_CHUNK>`,
    )
    .join("\n\n");
}

async function callOpenAi(query: string, chunks: ReaderRagChunk[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI chưa được cấu hình.");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.1,
      messages: [
        { role: "system", content: READER_RAG_SYSTEM_PROMPT },
        {
          role: "user",
          content: `BOOK_CHUNK được phép sử dụng:\n${buildChunkContext(chunks)}\n\nCÂU HỎI:\n${query}`,
        },
      ],
    }),
    signal: providerTimeoutSignal(),
  });

  if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}.`);
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const answer = payload.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error("OpenAI không trả nội dung.");
  return answer;
}

async function callGemini(query: string, chunks: ReaderRagChunk[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini chưa được cấu hình.");
  const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: READER_RAG_SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `BOOK_CHUNK được phép sử dụng:\n${buildChunkContext(chunks)}\n\nCÂU HỎI:\n${query}`,
              },
            ],
          },
        ],
        generationConfig: { temperature: 0.1 },
      }),
      signal: providerTimeoutSignal(),
    },
  );

  if (!response.ok) throw new Error(`Gemini HTTP ${response.status}.`);
  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const answer = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!answer) throw new Error("Gemini không trả nội dung.");
  return answer;
}

function selectProvider(): "openai" | "gemini" | "local" {
  const configured = process.env.BOOKVERSE_LLM_PROVIDER?.trim().toLowerCase();
  if (configured === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (configured === "gemini" && process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return "local";
}

function attachChapterTitles(
  citations: ReaderRagCitation[],
  chunks: ReaderRagChunk[],
): ReaderRagCitation[] {
  return citations.map((citation) => ({
    ...citation,
    chapterTitle: chunks.find(
      (chunk) => chunk.chapterNumber === citation.chapterNumber,
    )?.chapterTitle,
  }));
}

export async function askReaderRag(
  bookId: string,
  userQuery: string,
  currentChapterNumber: number,
): Promise<ReaderRagActionResult> {
  const cleanBookId = bookId.trim();
  const cleanQuery = userQuery.replace(/\s+/gu, " ").trim();
  const safeCurrentChapter = Math.max(1, Math.floor(currentChapterNumber || 1));

  if (!/^RB\d{5}$/u.test(cleanBookId) || cleanQuery.length < 2 || cleanQuery.length > 2_500) {
    return {
      success: false,
      answer: READER_RAG_NOT_FOUND,
      citations: [],
      provider: "local",
      retrievedChunkCount: 0,
      access: "PREVIEW",
      error: "Mã sách hoặc câu hỏi không hợp lệ.",
    };
  }

  try {
    const currentUser = await getCurrentUser();
    const entitlement =
      currentUser && !currentUser.isLocked
        ? await prisma.readingEntitlement.findUnique({
            where: {
              userId_bookId: {
                userId: currentUser.id,
                bookId: cleanBookId,
              },
            },
            select: { id: true },
          })
        : null;
    const access = entitlement ? "FULL" : "PREVIEW";
    const firstChapter = await prisma.bookChunk.findFirst({
      where: { bookId: cleanBookId },
      orderBy: [{ chapterNumber: "asc" }, { chunkIndex: "asc" }],
      select: { chapterNumber: true },
    });

    if (!firstChapter) {
      return {
        success: true,
        answer: READER_RAG_NOT_FOUND,
        citations: [],
        provider: "local",
        retrievedChunkCount: 0,
        access,
      };
    }

    // Không cho RAG làm lộ chương bị paywall khóa.
    const availableChunks = await prisma.bookChunk.findMany({
      where: {
        bookId: cleanBookId,
        ...(entitlement ? {} : { chapterNumber: firstChapter.chapterNumber }),
      },
      orderBy: [{ chapterNumber: "asc" }, { chunkIndex: "asc" }],
      select: {
        chapterNumber: true,
        chapterTitle: true,
        pageNumber: true,
        chunkIndex: true,
        content: true,
      },
    });
    const relevantChunks = rankReaderRagChunks(
      availableChunks,
      cleanQuery,
      safeCurrentChapter,
      5,
    );

    if (relevantChunks.length === 0) {
      return {
        success: true,
        answer: READER_RAG_NOT_FOUND,
        citations: [],
        provider: "local",
        retrievedChunkCount: 0,
        access,
      };
    }

    const provider = selectProvider();
    let answer = buildLocalGroundedReaderAnswer(cleanQuery, relevantChunks);
    let resolvedProvider: ReaderRagActionResult["provider"] = "local";

    if (provider !== "local") {
      try {
        answer =
          provider === "openai"
            ? await callOpenAi(cleanQuery, relevantChunks)
            : await callGemini(cleanQuery, relevantChunks);
        resolvedProvider = provider;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Provider AI gặp lỗi.";
        console.error(`[reader-rag] Dùng local grounded fallback: ${message.slice(0, 180)}`);
      }
    }

    // Hậu kiểm bắt buộc: câu trả lời thiếu/sai citation bị thay bằng local grounded answer.
    if (!areReaderRagCitationsGrounded(answer, relevantChunks)) {
      answer = buildLocalGroundedReaderAnswer(cleanQuery, relevantChunks);
      resolvedProvider = "local";
    }

    return {
      success: true,
      answer,
      citations: attachChapterTitles(parseReaderRagCitations(answer), relevantChunks),
      provider: resolvedProvider,
      retrievedChunkCount: relevantChunks.length,
      access,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Không thể truy vấn nội dung sách.";
    console.error(`[askReaderRag] ${message.slice(0, 180)}`);
    return {
      success: false,
      answer: READER_RAG_NOT_FOUND,
      citations: [],
      provider: "local",
      retrievedChunkCount: 0,
      access: "PREVIEW",
      error: "Trợ lý đọc sách đang tạm thời không khả dụng.",
    };
  }
}

