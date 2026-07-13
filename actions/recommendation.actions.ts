"use server";

import { RecommendationEvidenceType, TargetType } from "@prisma/client";
import { getCurrentUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://127.0.0.1:8000";
const AI_TIMEOUT_MS = 4_000;
const FALLBACK_LIMIT = 10;

type DecimalLike = {
  toNumber: () => number;
};

export type AIRecommendation = {
  bookId: string;
  score: number;
  evidence: string;
};

export interface RecommendedBook {
  id: string;
  title: string;
  author: string;
  coverImage: string | null;
  price: number;
  recommendationScore?: number;
  recommendationEvidence?: string;
}

function decimalToNumber(value: DecimalLike | number | string): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value.toNumber();
}

function normalizeCoverPath(coverPath: string | null): string | null {
  if (!coverPath) {
    return null;
  }

  if (coverPath.startsWith("/") || coverPath.startsWith("http")) {
    return coverPath;
  }

  return `/${coverPath}`;
}

function isAIRecommendation(value: unknown): value is AIRecommendation {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as {
    bookId?: unknown;
    score?: unknown;
    evidence?: unknown;
  };

  return (
    typeof candidate.bookId === "string" &&
    typeof candidate.score === "number" &&
    Number.isFinite(candidate.score) &&
    typeof candidate.evidence === "string"
  );
}

function isAIRecommendationResponse(value: unknown): value is AIRecommendation[] {
  return Array.isArray(value) && value.every(isAIRecommendation);
}

async function fetchAIRecommendations(userId: string): Promise<AIRecommendation[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(`${AI_SERVICE_URL}/recommend/${encodeURIComponent(userId)}`, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`AI service trả về HTTP ${response.status}.`);
    }

    const payload: unknown = await response.json();
    if (!isAIRecommendationResponse(payload)) {
      throw new Error("AI service trả dữ liệu không đúng định dạng.");
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

async function getBooksByRecommendations(
  recommendations: AIRecommendation[],
): Promise<RecommendedBook[]> {
  const uniqueBookIds = [...new Set(recommendations.map((item) => item.bookId))].filter(Boolean);
  if (uniqueBookIds.length === 0) {
    return [];
  }

  const books = await prisma.book.findMany({
    where: {
      id: {
        in: uniqueBookIds,
      },
    },
    select: {
      id: true,
      title: true,
      authorName: true,
      coverPath: true,
      price: true,
    },
  });

  const bookById = new Map(books.map((book) => [book.id, book]));
  const recommendationById = new Map(recommendations.map((item) => [item.bookId, item]));

  return uniqueBookIds
    .map((bookId) => bookById.get(bookId))
    .filter((book): book is NonNullable<typeof book> => Boolean(book))
    .map((book) => ({
      id: book.id,
      title: book.title,
      author: book.authorName,
      coverImage: normalizeCoverPath(book.coverPath),
      price: decimalToNumber(book.price),
      recommendationScore: recommendationById.get(book.id)?.score,
      recommendationEvidence: recommendationById.get(book.id)?.evidence,
    }));
}

async function persistRecommendations(
  userId: string,
  recommendations: AIRecommendation[],
): Promise<void> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    for (const [index, item] of recommendations.entries()) {
      const recommendation = await prisma.recommendation.upsert({
        where: {
          userId_targetType_targetId_algorithm: {
            userId,
            targetType: TargetType.BOOK,
            targetId: item.bookId,
            algorithm: "fastapi_hybrid_v2",
          },
        },
        update: {
          score: item.score,
          rank: index + 1,
          reason: item.evidence,
          generatedAt: now,
          expiresAt,
          isDismissed: false,
        },
        create: {
          userId,
          targetType: TargetType.BOOK,
          targetId: item.bookId,
          algorithm: "fastapi_hybrid_v2",
          score: item.score,
          rank: index + 1,
          reason: item.evidence,
          generatedAt: now,
          expiresAt,
        },
      });

      await prisma.$transaction([
        prisma.recommendationEvidence.deleteMany({
          where: {
            recommendationId: recommendation.id,
          },
        }),
        prisma.recommendationEvidence.create({
          data: {
            recommendationId: recommendation.id,
            type: item.evidence.includes("nổi bật")
              ? RecommendationEvidenceType.TRENDING
              : RecommendationEvidenceType.BEHAVIOR_MATCH,
            label: item.evidence,
            weight: item.score,
            sourceType: TargetType.BOOK,
            sourceId: item.bookId,
            metadata: {
              algorithm: "fastapi_hybrid_v2",
            },
          },
        }),
      ]);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[persistRecommendations] Không thể lưu evidence: ${message}`);
  }
}

async function getFallbackBooks(): Promise<RecommendedBook[]> {
  const books = await prisma.book.findMany({
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "asc",
      },
    ],
    take: FALLBACK_LIMIT,
    select: {
      id: true,
      title: true,
      authorName: true,
      coverPath: true,
      price: true,
    },
  });

  return books.map((book) => ({
    id: book.id,
    title: book.title,
    author: book.authorName,
    coverImage: normalizeCoverPath(book.coverPath),
    price: decimalToNumber(book.price),
  }));
}

async function getFallbackBooksSafely(context: string): Promise<RecommendedBook[]> {
  try {
    return await getFallbackBooks();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[getRecommendedBooks] Không thể lấy fallback (${context}): ${message}`);
    return [];
  }
}

export async function getRecommendedBooks(userId?: string): Promise<RecommendedBook[]> {
  const currentUser = userId ? null : await getCurrentUser();
  const resolvedUserId = userId ?? (currentUser && !currentUser.isLocked ? currentUser.id : undefined);

  if (!resolvedUserId) {
    return getFallbackBooksSafely("guest");
  }

  try {
    const recommendations = await fetchAIRecommendations(resolvedUserId);
    await persistRecommendations(resolvedUserId, recommendations);
    const recommendedBooks = await getBooksByRecommendations(recommendations);

    if (recommendedBooks.length === 0) {
      return getFallbackBooks();
    }

    return recommendedBooks;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[getRecommendedBooks] Fallback vì AI service lỗi: ${message}`);
    return getFallbackBooksSafely("ai_error");
  }
}

export async function refreshRecommendationsForUser(
  userId: string,
): Promise<{ count: number; algorithm: string }> {
  const cleanUserId = userId.trim();

  if (!cleanUserId) {
    throw new Error("Thiếu mã user để chạy lại recommendation.");
  }

  const recommendations = await fetchAIRecommendations(cleanUserId);
  await persistRecommendations(cleanUserId, recommendations);

  return {
    count: recommendations.length,
    algorithm: "fastapi_hybrid_v2",
  };
}
