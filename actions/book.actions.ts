"use server";

import { ListingStatus } from "@prisma/client";
import { normalizeBookCoverUrl } from "@/lib/book-cover";
import prisma from "@/lib/prisma";
import { loadSellerQualityScores } from "@/lib/seller-quality-data";

type DecimalLike = {
  toNumber: () => number;
};

export interface FeaturedBook {
  id: string;
  title: string;
  author: string;
  coverImage: string | null;
  price: number;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface MarketplaceListing {
  id: string;
  condition: string;
  price: number;
  seller: {
    id: string;
    name: string;
  };
  sellerQualityScore: {
    score: number;
    completedOrders: number;
    cancelledOrders: number;
    reportedListings: number;
    isHighQuality: boolean;
    badge: string;
    formulaVersion: string;
  };
  book: {
    id: string;
    title: string;
    author: string;
    coverImage: string | null;
    price: number;
  };
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

function getRandomOffsets(total: number, limit: number): number[] {
  const result = new Set<number>();
  const totalItems = Math.min(total, limit);

  while (result.size < totalItems) {
    result.add(Math.floor(Math.random() * total));
  }

  return Array.from(result);
}

function logActionError(actionName: string, error: unknown): void {
  const message = error instanceof Error ? error.message : "Lỗi không xác định";
  console.error(`[${actionName}] ${message}`);
}

export async function getFeaturedBooks(): Promise<FeaturedBook[]> {
  try {
    const totalBooks = await prisma.book.count();

    if (totalBooks === 0) {
      return [];
    }

    const randomOffsets = getRandomOffsets(totalBooks, 5);
    const books: FeaturedBook[] = [];

    for (const skip of randomOffsets) {
      const book = await prisma.book.findFirst({
        skip,
        orderBy: {
          id: "asc",
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      if (!book) {
        continue;
      }

      books.push({
        id: book.id,
        title: book.title,
        author: book.authorName,
        coverImage: normalizeBookCoverUrl(book.coverPath),
        price: decimalToNumber(book.price),
        category: book.category,
      });
    }

    return books;
  } catch (error: unknown) {
    logActionError("getFeaturedBooks", error);
    return [];
  }
}

export async function getMarketplaceListings(): Promise<MarketplaceListing[]> {
  try {
    const listings = await prisma.listing.findMany({
      where: {
        status: ListingStatus.APPROVED,
        book: {
          isNot: null,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 4,
      include: {
        seller: {
          select: {
            id: true,
            name: true,
          },
        },
        book: {
          select: {
            id: true,
            title: true,
            authorName: true,
            coverPath: true,
            price: true,
          },
        },
      },
    });

    const sellerQualityScores = await loadSellerQualityScores(listings.map((listing) => listing.seller.id));

    return listings.map((listing) => ({
      id: listing.id,
      condition: listing.condition,
      price: decimalToNumber(listing.price),
      seller: listing.seller,
      sellerQualityScore: (() => {
        const quality = sellerQualityScores.get(listing.seller.id);
        if (!quality) {
          throw new Error(`Không tính được điểm chất lượng cho seller ${listing.seller.id}.`);
        }

        return {
          score: quality.score,
          completedOrders: quality.facts.completedOrders,
          cancelledOrders: quality.facts.cancelledOrders,
          reportedListings: quality.facts.reportedListings,
          isHighQuality: quality.isHighQuality,
          badge: quality.badge,
          formulaVersion: quality.formulaVersion,
        };
      })(),
      book: {
        id: listing.book?.id ?? listing.id,
        title: listing.book?.title ?? listing.title,
        author: listing.book?.authorName ?? "Không rõ tác giả",
        coverImage: normalizeBookCoverUrl(listing.book?.coverPath ?? null),
        price: decimalToNumber(listing.book?.price ?? listing.price),
      },
    }));
  } catch (error: unknown) {
    logActionError("getMarketplaceListings", error);
    return [];
  }
}
