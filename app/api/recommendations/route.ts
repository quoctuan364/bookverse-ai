import { RecommendationSurface, TargetType } from "@prisma/client";
import { NextResponse } from "next/server";
import { normalizeBookCoverUrl } from "@/lib/book-cover";
import { getCurrentUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import {
  createRecommendationRequestSnapshotResult,
  syncRecommendationConversionsForUser,
  type RecommendationTrackingResult,
} from "@/lib/recommendation-telemetry";
import {
  dedupeRecommendationEvidence,
  normalizeRecommendationCandidates,
  type RecommendationNormalizationResult,
} from "@/lib/recommendation-position-policy";

type DecimalLike = {
  toNumber: () => number;
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

function parseLimit(value: string | null): number {
  const limit = Number(value);

  if (!Number.isInteger(limit) || limit <= 0) {
    return 12;
  }

  return Math.min(limit, 40);
}

async function createApiRequestSafely(
  userId: string,
  algorithmVersion: string,
  items: Array<{ bookId: string; position: number; score: number; evidence?: string | null }>,
): Promise<RecommendationTrackingResult> {
  return createRecommendationRequestSnapshotResult({
    userId,
    algorithmVersion,
    surface: RecommendationSurface.RECOMMENDATION_API,
    candidateProfile: "persisted-recommendation-catalog",
    filterProfile: "active-user-owned-request",
    items,
  });
}

function trackingContract<T>(
  tracking: RecommendationTrackingResult,
  normalization: RecommendationNormalizationResult<T>,
) {
  return {
    requestId: tracking.requestId,
    trackingStatus: tracking.trackingStatus,
    trackingReason:
      tracking.trackingStatus === "TRACKED" ? normalization.reason : tracking.trackingReason,
    trackingNormalization: normalization.stats,
  };
}

type EvidenceRow = {
  id: string;
  type: string;
  label: string;
  weight: number;
  sourceType: string | null;
  sourceId: string | null;
};

function serializeEvidence(evidence: EvidenceRow[]) {
  return dedupeRecommendationEvidence(evidence).map((item) => ({
    id: item.id,
    type: item.type,
    text: item.label,
    weight: item.weight,
    sourceType: item.sourceType,
    sourceId: item.sourceId,
  }));
}

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Bạn cần đăng nhập để xem gợi ý cá nhân hóa.",
        },
        {
          status: 401,
        },
      );
    }

    if (currentUser.isLocked) {
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

    const userId = currentUser.id;
    const requestUrl = new URL(request.url);
    const limit = parseLimit(requestUrl.searchParams.get("limit"));
    const now = new Date();
    try {
      await syncRecommendationConversionsForUser(userId, now);
    } catch {
      console.error("[api/recommendations] Bỏ qua lỗi đồng bộ conversion telemetry.");
    }

    const dailyRecommendations = await prisma.dailyRecommendation.findMany({
      where: {
        userId,
        OR: [
          {
            expiresAt: null,
          },
          {
            expiresAt: {
              gt: now,
            },
          },
        ],
      },
      orderBy: [
        {
          rank: "asc",
        },
        {
          score: "desc",
        },
        {
          generatedAt: "desc",
        },
        {
          id: "asc",
        },
      ],
      take: Math.min(limit * 4, 160),
      include: {
        book: {
          select: {
            id: true,
            title: true,
            authorName: true,
            coverPath: true,
            price: true,
            rating: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        evidence: {
          orderBy: {
            weight: "desc",
          },
          select: {
            id: true,
            type: true,
            label: true,
            weight: true,
            sourceType: true,
            sourceId: true,
          },
        },
      },
    });

    if (dailyRecommendations.length > 0) {
      const normalization = normalizeRecommendationCandidates(
        dailyRecommendations.map((item, index) => ({
          bookId: item.book.id,
          rank: item.rank,
          score: item.score,
          evidence: item.reason ?? item.evidence[0]?.label ?? null,
          source: "DAILY" as const,
          productionOrder: index,
          payload: item,
        })),
        limit,
      );
      const tracking = await createApiRequestSafely(
        userId,
        normalization.items[0]?.payload.algorithm ?? "daily_hybrid_v1",
        normalization.items.map((item) => ({
          bookId: item.bookId,
          position: item.position,
          score: item.score,
          evidence: item.evidence,
        })),
      );
      return NextResponse.json(
        {
          success: true,
          source: "daily_recommendations",
          ...trackingContract(tracking, normalization),
          data: normalization.items.map(({ payload: recommendation, position }) => ({
            id: recommendation.id,
            rank: recommendation.rank,
            position,
            score: recommendation.score,
            reason: recommendation.reason ?? recommendation.evidence[0]?.label ?? null,
            algorithm: recommendation.algorithm,
            generatedAt: recommendation.generatedAt.toISOString(),
            expiresAt: recommendation.expiresAt?.toISOString() ?? null,
            book: {
              id: recommendation.book.id,
              title: recommendation.book.title,
              author: recommendation.book.authorName,
              cover_url: normalizeBookCoverUrl(recommendation.book.coverPath),
              price: decimalToNumber(recommendation.book.price),
              rating: recommendation.book.rating ? decimalToNumber(recommendation.book.rating) : null,
              category: recommendation.book.category,
            },
            evidence: serializeEvidence(recommendation.evidence),
          })),
          meta: {
            count: normalization.items.length,
            rawCount: dailyRecommendations.length,
            limit,
          },
        },
        {
          status: 200,
        },
      );
    }

    const fallbackRecommendations = await prisma.recommendation.findMany({
      where: {
        userId,
        targetType: TargetType.BOOK,
        isDismissed: false,
      },
      orderBy: [
        {
          rank: "asc",
        },
        {
          score: "desc",
        },
        {
          generatedAt: "desc",
        },
        {
          id: "asc",
        },
      ],
      take: Math.min(limit * 4, 160),
      include: {
        evidence: {
          orderBy: {
            weight: "desc",
          },
          select: {
            id: true,
            type: true,
            label: true,
            weight: true,
            sourceType: true,
            sourceId: true,
          },
        },
      },
    });
    const bookIds = fallbackRecommendations.map((recommendation) => recommendation.targetId);
    const books = await prisma.book.findMany({
      where: {
        id: {
          in: bookIds,
        },
      },
      select: {
        id: true,
        title: true,
        authorName: true,
        coverPath: true,
        price: true,
        rating: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
    const bookById = new Map(books.map((book) => [book.id, book]));
    const validFallback = fallbackRecommendations.filter((item) => bookById.has(item.targetId));
    const normalization = normalizeRecommendationCandidates(
      validFallback.map((item, index) => ({
        bookId: item.targetId,
        rank: item.rank,
        score: item.score,
        evidence: item.reason ?? item.evidence[0]?.label ?? null,
        source: item.algorithm === "fastapi_hybrid_v2" ? ("CURRENT" as const) : ("LEGACY" as const),
        productionOrder: index,
        payload: item,
      })),
      limit,
    );
    const tracking = await createApiRequestSafely(
      userId,
      normalization.items[0]?.payload.algorithm ?? "fastapi_hybrid_v2",
      normalization.items.map((item) => ({
        bookId: item.bookId,
        position: item.position,
        score: item.score,
        evidence: item.evidence,
      })),
    );

    return NextResponse.json(
      {
        success: true,
        source: "recommendations",
        ...trackingContract(tracking, normalization),
        data: normalization.items
          .map(({ payload: recommendation, position }) => {
            const book = bookById.get(recommendation.targetId);

            if (!book) {
              return null;
            }

            return {
              id: recommendation.id,
              rank: recommendation.rank,
              position,
              score: recommendation.score,
              reason: recommendation.reason ?? recommendation.evidence[0]?.label ?? null,
              algorithm: recommendation.algorithm,
              generatedAt: recommendation.generatedAt.toISOString(),
              expiresAt: recommendation.expiresAt?.toISOString() ?? null,
              book: {
                id: book.id,
                title: book.title,
                author: book.authorName,
                cover_url: normalizeBookCoverUrl(book.coverPath),
                price: decimalToNumber(book.price),
                rating: book.rating ? decimalToNumber(book.rating) : null,
                category: book.category,
              },
              evidence: serializeEvidence(recommendation.evidence),
            };
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item)),
        meta: {
          count: normalization.items.length,
          rawCount: fallbackRecommendations.length,
          limit,
        },
      },
      {
        status: 200,
      },
    );
  } catch (error: unknown) {
    // Không log raw Prisma/SQL/connection string.
    console.error("[api/recommendations] request failed");

    return NextResponse.json(
      {
        success: false,
        error: "Không thể lấy gợi ý sách cá nhân hóa.",
      },
      {
        status: 500,
      },
    );
  }
}
