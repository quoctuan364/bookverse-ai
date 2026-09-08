import { ListingCondition, ListingStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { normalizeBookCoverUrl } from "@/lib/book-cover";
import { getVietnameseBookTitle } from "@/lib/book-display-title";
import { observeApiRoute, writeServerLog } from "@/lib/observability";
import prisma from "@/lib/prisma";
import { publicBookQualityWhere } from "@/lib/public-book-policy";
import { loadSellerQualityScores } from "@/lib/seller-quality-data";

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

async function handleGet(request: Request): Promise<Response> {
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
          is: publicBookQualityWhere(),
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
          },
        },
      },
    });
    const sellerQualityScores = await loadSellerQualityScores(listings.map((listing) => listing.seller.id));

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
                title: getVietnameseBookTitle(listing.book.id, listing.book.title),
                author: listing.book.authorName,
                cover_url: normalizeBookCoverUrl(listing.book.coverPath),
                price: decimalToNumber(listing.book.price),
                rating: listing.book.rating ? decimalToNumber(listing.book.rating) : null,
              }
            : null,
          seller: {
            id: listing.seller.id,
            name: listing.seller.name,
            quality_score: (() => {
              const quality = sellerQualityScores.get(listing.seller.id);
              return quality
                ? {
                    score: quality.score,
                    completed_orders: quality.facts.completedOrders,
                    cancelled_orders: quality.facts.cancelledOrders,
                    reported_listings: quality.facts.reportedListings,
                    badge: quality.badge,
                    formula_version: quality.formulaVersion,
                    reasons: quality.reasons,
                  }
                : null;
            })(),
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
    writeServerLog("error", "api.marketplace.failed", { error: message });

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

export async function GET(request: Request): Promise<Response> {
  return observeApiRoute(request, "api.marketplace", () => handleGet(request));
}
