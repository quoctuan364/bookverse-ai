import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";

export type EmbeddingProvider = "openai" | "gemini";

interface BookForEmbedding {
  id: string;
  title: string;
  authorName: string;
  description: string | null;
  level: string | null;
  category: {
    name: string;
  };
  tags: Array<{
    name: string;
  }>;
}

export interface GeneratedBookEmbedding {
  bookId: string;
  title: string;
  provider: EmbeddingProvider;
  model: string;
  dimensions: number;
  contentLength: number;
}

export function getEmbeddingProvider(): EmbeddingProvider {
  const configuredProvider = process.env.BOOKVERSE_EMBEDDING_PROVIDER?.toLowerCase();

  if (configuredProvider === "gemini") {
    return "gemini";
  }

  return "openai";
}

export function getEmbeddingModel(provider: EmbeddingProvider): string {
  if (provider === "gemini") {
    return process.env.GEMINI_EMBEDDING_MODEL ?? "text-embedding-004";
  }

  return process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
}

export function buildEmbeddingContent(book: BookForEmbedding): string {
  const tags = book.tags.map((tag) => tag.name).join(", ");

  return [
    `Tên sách: ${book.title}`,
    `Tác giả: ${book.authorName}`,
    `Thể loại: ${book.category.name}`,
    book.level ? `Cấp độ: ${book.level}` : "",
    tags ? `Thẻ: ${tags}` : "",
    book.description ? `Mô tả: ${book.description}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function toVectorLiteral(embedding: number[]): string {
  if (embedding.length === 0 || embedding.some((value) => !Number.isFinite(value))) {
    throw new Error("Embedding không hợp lệ.");
  }

  return `[${embedding.map((value) => Number(value).toFixed(8)).join(",")}]`;
}

async function createOpenAiEmbedding(input: string, model: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Thiếu OPENAI_API_KEY để tạo embedding.");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
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
  const embedding = payload.data?.[0]?.embedding;

  if (!embedding) {
    throw new Error("OpenAI không trả embedding.");
  }

  return embedding;
}

async function createGeminiEmbedding(input: string, model: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Thiếu GEMINI_API_KEY để tạo embedding.");
  }

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
  const embedding = payload.embedding?.values;

  if (!embedding) {
    throw new Error("Gemini không trả embedding.");
  }

  return embedding;
}

export async function createTextEmbedding(
  input: string,
  provider: EmbeddingProvider,
  model: string,
): Promise<number[]> {
  if (provider === "gemini") {
    return createGeminiEmbedding(input, model);
  }

  return createOpenAiEmbedding(input, model);
}

export async function generateBookEmbedding(bookId: string): Promise<GeneratedBookEmbedding> {
  const cleanBookId = bookId.trim();

  if (!cleanBookId) {
    throw new Error("Thiếu mã sách để tạo embedding.");
  }

  const book = await prisma.book.findUnique({
    where: {
      id: cleanBookId,
    },
    include: {
      category: {
        select: {
          name: true,
        },
      },
      tags: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!book) {
    throw new Error("Không tìm thấy sách để tạo embedding.");
  }

  const provider = getEmbeddingProvider();
  const model = getEmbeddingModel(provider);
  const content = buildEmbeddingContent(book);
  const embedding = await createTextEmbedding(content, provider, model);
  const vectorLiteral = toVectorLiteral(embedding);

  await prisma.$executeRawUnsafe(
    `
    INSERT INTO "book_embeddings" ("id", "bookId", "content", "embedding", "model", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4::vector, $5, NOW(), NOW())
    ON CONFLICT ("bookId")
    DO UPDATE SET
      "content" = EXCLUDED."content",
      "embedding" = EXCLUDED."embedding",
      "model" = EXCLUDED."model",
      "updatedAt" = NOW()
    `,
    randomUUID(),
    book.id,
    content,
    vectorLiteral,
    model,
  );

  return {
    bookId: book.id,
    title: book.title,
    provider,
    model,
    dimensions: embedding.length,
    contentLength: content.length,
  };
}
