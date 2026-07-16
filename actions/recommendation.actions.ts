"use server";

import {
  RecommendationEvidenceType,
  RecommendationSurface,
  TargetType,
} from "@prisma/client";
import { normalizeBookCoverUrl } from "@/lib/book-cover";
import { getCurrentUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import {
  createRecommendationRequestSnapshotResult,
  syncRecommendationConversionsForUser,
  type RecommendationTrackingResult,
} from "@/lib/recommendation-telemetry";
import {
  normalizeRecommendationCandidates,
  type RecommendationNormalizationStats,
  type RecommendationTrackingReason,
  type RecommendationTrackingStatus,
} from "@/lib/recommendation-position-policy";

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

export interface RecommendationBatch {
  books: RecommendedBook[];
  requestId: string | null;
  source: "fastapi_hybrid_v2" | "fallback";
  trackingStatus: RecommendationTrackingStatus;
  trackingReason: RecommendationTrackingReason;
  trackingNormalization: RecommendationNormalizationStats;
}

const EMPTY_NORMALIZATION: RecommendationNormalizationStats = {
  inputCount: 0,
  outputCount: 0,
  duplicateBookCount: 0,
  duplicateRankCount: 0,
  invalidRankCount: 0,
  invalidCandidateCount: 0,
  truncatedCount: 0,
};

function decimalToNumber(value: DecimalLike | number | string): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value.toNumber();
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
      coverImage: normalizeBookCoverUrl(book.coverPath),
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
    // Không log raw Prisma error vì có thể chứa SQL hoặc connection string.
    console.error("[persistRecommendations] Không thể lưu recommendation/evidence.");
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
    coverImage: normalizeBookCoverUrl(book.coverPath),
    price: decimalToNumber(book.price),
  }));
}

async function getFallbackBooksSafely(context: string): Promise<RecommendedBook[]> {
  try {
    return await getFallbackBooks();
  } catch (error: unknown) {
    console.error(`[getRecommendedBooks] Không thể lấy fallback (${context}).`);
    return [];
  }
}

async function syncConversionsSafely(userId: string): Promise<void> {
  try {
    await syncRecommendationConversionsForUser(userId);
  } catch {
    console.error("[getRecommendedBooks] Bỏ qua lỗi đồng bộ conversion telemetry.");
  }
}

async function createRequestSnapshotSafely(
  userId: string,
  books: RecommendedBook[],
): Promise<RecommendationTrackingResult> {
  return createRecommendationRequestSnapshotResult({
    userId,
    algorithmVersion: "fastapi_hybrid_v2",
    surface: RecommendationSurface.HOME,
    candidateProfile: "active-not-deleted-current-catalog",
    filterProfile: "exclude-user-history-production",
    items: books.map((book, index) => ({
      bookId: book.id,
      position: index + 1,
      score: book.recommendationScore ?? 0,
      evidence: book.recommendationEvidence ?? null,
      source: "CURRENT",
      productionOrder: index,
    })),
  });
}

export async function getRecommendedBooks(): Promise<RecommendationBatch> {
  const currentUser = await getCurrentUser();
  const resolvedUserId = currentUser && !currentUser.isLocked ? currentUser.id : undefined;

  if (!resolvedUserId) {
    return {
      books: await getFallbackBooksSafely("guest"),
      requestId: null,
      source: "fallback",
      trackingStatus: "DEGRADED",
      trackingReason: "REQUEST_VALIDATION_FAILED",
      trackingNormalization: EMPTY_NORMALIZATION,
    };
  }

  try {
    await syncConversionsSafely(resolvedUserId);
    const recommendations = await fetchAIRecommendations(resolvedUserId);
    const normalization = normalizeRecommendationCandidates(
      recommendations.map((item, index) => ({
        bookId: item.bookId,
        rank: index + 1,
        score: item.score,
        evidence: item.evidence,
        source: "CURRENT" as const,
        productionOrder: index,
        payload: item,
      })),
      FALLBACK_LIMIT,
    );
    const normalizedRecommendations = normalization.items.map((item) => item.payload);
    await persistRecommendations(resolvedUserId, normalizedRecommendations);
    const recommendedBooks = await getBooksByRecommendations(normalizedRecommendations);

    if (recommendedBooks.length === 0) {
      return {
        books: await getFallbackBooks(),
        requestId: null,
        source: "fallback",
        trackingStatus: "DEGRADED",
        trackingReason: "REQUEST_VALIDATION_FAILED",
        trackingNormalization: normalization.stats,
      };
    }

    const tracking = await createRequestSnapshotSafely(resolvedUserId, recommendedBooks);
    return {
      books: recommendedBooks,
      requestId: tracking.requestId,
      source: "fastapi_hybrid_v2",
      trackingStatus: tracking.trackingStatus,
      trackingReason:
        tracking.trackingStatus === "TRACKED" ? normalization.reason : tracking.trackingReason,
      trackingNormalization: normalization.stats,
    };
  } catch (error: unknown) {
    console.error("[getRecommendedBooks] Fallback vì AI service lỗi.");
    return {
      books: await getFallbackBooksSafely("ai_error"),
      requestId: null,
      source: "fallback",
      trackingStatus: "DEGRADED",
      trackingReason: "PERSISTENCE_UNAVAILABLE",
      trackingNormalization: EMPTY_NORMALIZATION,
    };
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
  const normalization = normalizeRecommendationCandidates(
    recommendations.map((item, index) => ({
      bookId: item.bookId,
      rank: index + 1,
      score: item.score,
      evidence: item.evidence,
      source: "CURRENT" as const,
      productionOrder: index,
      payload: item,
    })),
    FALLBACK_LIMIT,
  );
  const normalizedRecommendations = normalization.items.map((item) => item.payload);
  await persistRecommendations(cleanUserId, normalizedRecommendations);

  return {
    count: normalizedRecommendations.length,
    algorithm: "fastapi_hybrid_v2",
  };
}
