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
  catalogBookQualityWhere,
  publicBookQualityWhere,
} from "@/lib/public-book-policy";
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
import {
  getRecommendationEvidenceStatus,
  RECOMMENDATION_ALGORITHM_VERSION,
  RECOMMENDATION_TAXONOMY_VERSION,
  type RecommendationEvidenceStatus,
} from "@/lib/recommendation-evidence-policy";
import { diversifyRecommendationCandidates } from "@/lib/recommendation-diversity";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://127.0.0.1:8000";
const AI_SERVICE_TOKEN = process.env.BOOKVERSE_AI_SERVICE_TOKEN?.trim();
const AI_TIMEOUT_MS = 4_000;
const FALLBACK_LIMIT = 10;

type DecimalLike = {
  toNumber: () => number;
};

export type AIRecommendation = {
  bookId: string;
  score: number;
  evidence: string;
  provenance?: unknown;
  evidenceStatus?: RecommendationEvidenceStatus;
};

export interface RecommendedBook {
  id: string;
  title: string;
  author: string;
  coverImage: string | null;
  price: number;
  recommendationScore?: number;
  recommendationEvidence?: string;
  recommendationEvidenceStatus?: RecommendationEvidenceStatus;
  availableListingId?: string | null;
  isFavorite?: boolean;
}

export interface RecommendationBatch {
  books: RecommendedBook[];
  requestId: string | null;
  source: "fastapi_hybrid_v2" | "fallback";
  trackingStatus: RecommendationTrackingStatus;
  trackingReason: RecommendationTrackingReason;
  trackingNormalization: RecommendationNormalizationStats;
  hasVerifiedPersonalization: boolean;
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
    provenance?: unknown;
  };

  return (
    typeof candidate.bookId === "string" &&
    typeof candidate.score === "number" &&
    Number.isFinite(candidate.score) &&
    typeof candidate.evidence === "string" &&
    (candidate.provenance === undefined || (typeof candidate.provenance === "object" && candidate.provenance !== null))
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
      headers: AI_SERVICE_TOKEN ? { "X-BookVerse-Service-Token": AI_SERVICE_TOKEN } : undefined,
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
  userId: string,
): Promise<RecommendedBook[]> {
  const uniqueBookIds = [...new Set(recommendations.map((item) => item.bookId))].filter(Boolean);
  if (uniqueBookIds.length === 0) {
    return [];
  }

  const hasPublicRealCatalog =
    (await prisma.book.count({ where: publicBookQualityWhere(), take: 1 })) > 0;
  const books = await prisma.book.findMany({
    where: {
      AND: [
        catalogBookQualityWhere(hasPublicRealCatalog),
        { id: { in: uniqueBookIds } },
      ],
    },
    select: {
      id: true,
      title: true,
      authorName: true,
      categoryId: true,
      coverPath: true,
      price: true,
      listings: {
        where: {
          status: "APPROVED",
          stock: { gt: 0 },
        },
        orderBy: { price: "asc" },
        take: 1,
        select: { id: true },
      },
      favoriteBooks: {
        where: { userId },
        take: 1,
        select: { id: true },
      },
    },
  });

  const bookById = new Map(books.map((book) => [book.id, book]));
  const recommendationById = new Map(recommendations.map((item) => [item.bookId, item]));

  const candidates = uniqueBookIds
    .map((bookId) => bookById.get(bookId))
    .filter((book): book is NonNullable<typeof book> => Boolean(book))
    .map((book) => ({
      id: book.id,
      title: book.title,
      author: book.authorName,
      categoryId: book.categoryId,
      coverImage: normalizeBookCoverUrl(book.coverPath),
      price: decimalToNumber(book.price),
      recommendationScore: recommendationById.get(book.id)?.score,
      recommendationEvidence: recommendationById.get(book.id)?.evidence,
      recommendationEvidenceStatus: getRecommendationEvidenceStatus({
        evidence: recommendationById.get(book.id)?.evidence,
        provenance: recommendationById.get(book.id)?.provenance,
        expectedUserId: userId,
      }),
      availableListingId: book.listings[0]?.id ?? null,
      isFavorite: book.favoriteBooks.length > 0,
    }));

  return diversifyRecommendationCandidates(candidates, {
    limit: FALLBACK_LIMIT,
    maxPerCategory: 2,
    maxPerAuthor: 1,
  }).map((candidate): RecommendedBook => ({
    id: candidate.id,
    title: candidate.title,
    author: candidate.author,
    coverImage: candidate.coverImage,
    price: candidate.price,
    recommendationScore: candidate.recommendationScore,
    recommendationEvidence: candidate.recommendationEvidence,
    recommendationEvidenceStatus: candidate.recommendationEvidenceStatus,
    availableListingId: candidate.availableListingId,
    isFavorite: candidate.isFavorite,
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
            algorithm: RECOMMENDATION_ALGORITHM_VERSION,
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
          algorithm: RECOMMENDATION_ALGORITHM_VERSION,
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
              algorithm: RECOMMENDATION_ALGORITHM_VERSION,
              taxonomyVersion: RECOMMENDATION_TAXONOMY_VERSION,
              evidenceStatus: item.evidenceStatus ?? "MISSING_PROVENANCE",
              provenance: item.provenance ?? null,
            },
          },
        }),
      ]);
    }
  } catch {
    // Không log raw Prisma error vì có thể chứa SQL hoặc connection string.
    console.error("[persistRecommendations] Không thể lưu recommendation/evidence.");
  }
}

async function getFallbackBooks(userId?: string): Promise<RecommendedBook[]> {
  const hasPublicRealCatalog =
    (await prisma.book.count({ where: publicBookQualityWhere(), take: 1 })) > 0;
  const books = await prisma.book.findMany({
    where: catalogBookQualityWhere(hasPublicRealCatalog),
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
      listings: {
        where: {
          status: "APPROVED",
          stock: { gt: 0 },
        },
        orderBy: { price: "asc" },
        take: 1,
        select: { id: true },
      },
      favoriteBooks: {
        where: { userId: userId ?? "__BOOKVERSE_GUEST__" },
        take: 1,
        select: { id: true },
      },
    },
  });

  return books.map((book) => ({
    id: book.id,
    title: book.title,
    author: book.authorName,
    coverImage: normalizeBookCoverUrl(book.coverPath),
    price: decimalToNumber(book.price),
    recommendationEvidenceStatus: "POPULARITY_FALLBACK",
    availableListingId: book.listings[0]?.id ?? null,
    isFavorite: book.favoriteBooks.length > 0,
  }));
}

async function getFallbackBooksSafely(context: string, userId?: string): Promise<RecommendedBook[]> {
  try {
    return await getFallbackBooks(userId);
  } catch {
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
    candidateProfile: "active-not-deleted-current-catalog-diversity-v1",
    filterProfile: "exclude-user-history-production",
    items: books.map((book, index) => ({
      bookId: book.id,
      position: index + 1,
      score: book.recommendationScore ?? 0,
      evidence: book.recommendationEvidence ?? null,
      source: "CURRENT",
      sourceComponent: "HYBRID_PRODUCTION",
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
      hasVerifiedPersonalization: false,
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
    const recommendationsWithStatus = normalizedRecommendations.map((item) => ({
      ...item,
      evidenceStatus: getRecommendationEvidenceStatus({
        evidence: item.evidence,
        provenance: item.provenance,
        expectedUserId: resolvedUserId,
      }),
    }));
    const recommendedBooks = await getBooksByRecommendations(recommendationsWithStatus, resolvedUserId);

    const displayedRecommendationIds = recommendedBooks.map((book) => book.id);
    const recommendationByBookId = new Map(
      recommendationsWithStatus.map((item) => [item.bookId, item]),
    );
    const displayedRecommendations = displayedRecommendationIds
      .map((bookId) => recommendationByBookId.get(bookId))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    await persistRecommendations(
      resolvedUserId,
      displayedRecommendations,
    );

    if (recommendedBooks.length === 0) {
      return {
        books: await getFallbackBooks(resolvedUserId),
        requestId: null,
        source: "fallback",
        trackingStatus: "DEGRADED",
        trackingReason: "REQUEST_VALIDATION_FAILED",
        trackingNormalization: normalization.stats,
        hasVerifiedPersonalization: false,
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
      hasVerifiedPersonalization: recommendedBooks.some((book) => book.recommendationEvidenceStatus === "VERIFIED_REAL_USER"),
    };
  } catch {
    console.error("[getRecommendedBooks] Fallback vì AI service lỗi.");
    return {
      books: await getFallbackBooksSafely("ai_error", resolvedUserId),
      requestId: null,
      source: "fallback",
      trackingStatus: "DEGRADED",
      trackingReason: "PERSISTENCE_UNAVAILABLE",
      trackingNormalization: EMPTY_NORMALIZATION,
      hasVerifiedPersonalization: false,
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
  const recommendationsWithStatus = normalizedRecommendations.map((item) => ({
    ...item,
    evidenceStatus: getRecommendationEvidenceStatus({
      evidence: item.evidence,
      provenance: item.provenance,
      expectedUserId: cleanUserId,
    }),
  }));
  const allowedBooks = await getBooksByRecommendations(recommendationsWithStatus, cleanUserId);
  const allowedBookIds = new Set(allowedBooks.map((book) => book.id));
  const isolatedRecommendations = recommendationsWithStatus.filter((item) =>
    allowedBookIds.has(item.bookId),
  );
  await persistRecommendations(cleanUserId, isolatedRecommendations);

  return {
    count: isolatedRecommendations.length,
    algorithm: RECOMMENDATION_ALGORITHM_VERSION,
  };
}
