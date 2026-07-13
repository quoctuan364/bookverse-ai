import { TargetType } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";

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

function normalizeCoverPath(coverPath: string | null): string | null {
  if (!coverPath) {
    return null;
  }

  if (coverPath.startsWith("/") || coverPath.startsWith("http")) {
    return coverPath;
  }

  return `/${coverPath}`;
}

function parseLimit(value: string | null): number {
  const limit = Number(value);

  if (!Number.isInteger(limit) || limit <= 0) {
    return 12;
  }

  return Math.min(limit, 40);
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
      ],
      take: limit,
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
      return NextResponse.json(
        {
          success: true,
          source: "daily_recommendations",
          data: dailyRecommendations.map((recommendation) => ({
            id: recommendation.id,
            rank: recommendation.rank,
            score: recommendation.score,
            reason: recommendation.reason ?? recommendation.evidence[0]?.label ?? null,
            algorithm: recommendation.algorithm,
            generatedAt: recommendation.generatedAt.toISOString(),
            expiresAt: recommendation.expiresAt?.toISOString() ?? null,
            book: {
              id: recommendation.book.id,
              title: recommendation.book.title,
              author: recommendation.book.authorName,
              cover_url: normalizeCoverPath(recommendation.book.coverPath),
              price: decimalToNumber(recommendation.book.price),
              rating: recommendation.book.rating ? decimalToNumber(recommendation.book.rating) : null,
              category: recommendation.book.category,
            },
            evidence: recommendation.evidence.map((item) => ({
              id: item.id,
              type: item.type,
              text: item.label,
              weight: item.weight,
              sourceType: item.sourceType,
              sourceId: item.sourceId,
            })),
          })),
          meta: {
            count: dailyRecommendations.length,
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
      ],
      take: limit,
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

    return NextResponse.json(
      {
        success: true,
        source: "recommendations",
        data: fallbackRecommendations
          .map((recommendation) => {
            const book = bookById.get(recommendation.targetId);

            if (!book) {
              return null;
            }

            return {
              id: recommendation.id,
              rank: recommendation.rank,
              score: recommendation.score,
              reason: recommendation.reason ?? recommendation.evidence[0]?.label ?? null,
              algorithm: recommendation.algorithm,
              generatedAt: recommendation.generatedAt.toISOString(),
              expiresAt: recommendation.expiresAt?.toISOString() ?? null,
              book: {
                id: book.id,
                title: book.title,
                author: book.authorName,
                cover_url: normalizeCoverPath(book.coverPath),
                price: decimalToNumber(book.price),
                rating: book.rating ? decimalToNumber(book.rating) : null,
                category: book.category,
              },
              evidence: recommendation.evidence.map((item) => ({
                id: item.id,
                type: item.type,
                text: item.label,
                weight: item.weight,
                sourceType: item.sourceType,
                sourceId: item.sourceId,
              })),
            };
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item)),
        meta: {
          count: fallbackRecommendations.length,
          limit,
        },
      },
      {
        status: 200,
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[api/recommendations] ${message}`);

    return NextResponse.json(
      {
        success: false,
        error: "Không thể lấy gợi ý sách cá nhân hóa.",
        detail: process.env.NODE_ENV === "development" ? message : undefined,
      },
      {
        status: 500,
      },
    );
  }
}
