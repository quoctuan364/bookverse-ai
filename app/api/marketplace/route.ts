import { ListingCondition, ListingStatus } from "@prisma/client";
import { NextResponse } from "next/server";
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

function parseCondition(value: string | null): ListingCondition | null {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toUpperCase();

  if (normalizedValue in ListingCondition) {
    return ListingCondition[normalizedValue as keyof typeof ListingCondition];
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const rawCondition = requestUrl.searchParams.get("condition");
    const condition = parseCondition(rawCondition);

    if (rawCondition && !condition) {
      return NextResponse.json(
        {
          success: false,
          error: "Tình trạng sách không hợp lệ.",
          allowedConditions: Object.values(ListingCondition),
        },
        {
          status: 400,
        },
      );
    }

    const listings = await prisma.listing.findMany({
      where: {
        status: ListingStatus.APPROVED,
        condition: condition ?? undefined,
        book: {
          isNot: null,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 60,
      include: {
        book: {
          select: {
            id: true,
            title: true,
            authorName: true,
            coverPath: true,
            price: true,
            rating: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            sellerAiScore: {
              select: {
                score: true,
                completedOrders: true,
                responseRate: true,
                trusted: true,
                explanation: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: listings.map((listing) => ({
          id: listing.id,
          title: listing.title,
          description: listing.description,
          condition: listing.condition,
          price: decimalToNumber(listing.price),
          status: listing.status,
          views: listing.views,
          cartAdds: listing.cartAdds,
          purchases: listing.purchases,
          createdAt: listing.createdAt.toISOString(),
          book: listing.book
            ? {
                id: listing.book.id,
                title: listing.book.title,
                author: listing.book.authorName,
                cover_url: normalizeCoverPath(listing.book.coverPath),
                price: decimalToNumber(listing.book.price),
                rating: listing.book.rating ? decimalToNumber(listing.book.rating) : null,
              }
            : null,
          seller: {
            id: listing.seller.id,
            name: listing.seller.name,
            ai_score: listing.seller.sellerAiScore
              ? {
                  score: listing.seller.sellerAiScore.score,
                  completed_orders: listing.seller.sellerAiScore.completedOrders,
                  response_rate: listing.seller.sellerAiScore.responseRate,
                  trusted: listing.seller.sellerAiScore.trusted,
                  explanation: listing.seller.sellerAiScore.explanation,
                }
              : null,
          },
        })),
        meta: {
          count: listings.length,
          status: ListingStatus.APPROVED,
          condition,
        },
      },
      {
        status: 200,
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[api/marketplace] ${message}`);

    return NextResponse.json(
      {
        success: false,
        error: "Không thể lấy danh sách chợ sách cũ.",
        detail: process.env.NODE_ENV === "development" ? message : undefined,
      },
      {
        status: 500,
      },
    );
  }
}
