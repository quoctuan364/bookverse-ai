"use server";

import { ListingStatus } from "@prisma/client";
import { normalizeBookCoverUrl } from "@/lib/book-cover";
import { getCurrentUser } from "@/lib/permissions";
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

export interface CuratedBook {
  id: string;
  title: string;
  author: string;
  coverImage: string | null;
  price: number;
  catalogSource: "CURATED_REAL";
  metadataBadge: "Sách tuyển chọn";
  priceLabel: "Giá BookVerse";
  sourceRating: number | null;
  category: string | null;
  isFavorite: boolean;
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

function logActionError(actionName: string, error: unknown): void {
  const message = error instanceof Error ? error.message : "Lỗi không xác định";
  console.error(`[${actionName}] ${message}`);
}

export async function getFeaturedBooks(): Promise<FeaturedBook[]> {
  try {
    // Danh sách ổn định giúp cùng source cho cùng kết quả và loại Math.random khỏi runtime production.
    const books = await prisma.book.findMany({
      orderBy: [{ rating: "desc" }, { id: "asc" }],
      take: 5,
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

    return books.map((book) => ({
      id: book.id,
      title: book.title,
      author: book.authorName,
      coverImage: normalizeBookCoverUrl(book.coverPath),
      price: decimalToNumber(book.price),
      category: book.category,
    }));
  } catch (error: unknown) {
    logActionError("getFeaturedBooks", error);
    return [];
  }
}

export async function getCuratedBooks(): Promise<CuratedBook[]> {
  try {
    const currentUser = await getCurrentUser();
    const userId = currentUser && !currentUser.isLocked ? currentUser.id : null;
    const books = await prisma.book.findMany({
      where: {
        sourceMetadata: {
          is: {
            sourceProvider: "OPEN_LIBRARY",
          },
        },
      },
      orderBy: [
        { sourceMetadata: { sourceRatingAverage: { sort: "desc", nulls: "last" } } },
        { title: "asc" },
        { id: "asc" },
      ],
      take: 10,
      select: {
        id: true,
        title: true,
        authorName: true,
        coverPath: true,
        price: true,
        sourceMetadata: {
          select: {
            sourceRatingAverage: true,
          },
        },
        category: {
          select: { name: true },
        },
        favoriteBooks: {
          where: {
            userId: userId ?? "__BOOKVERSE_GUEST__",
          },
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
      catalogSource: "CURATED_REAL",
      metadataBadge: "Sách tuyển chọn",
      priceLabel: "Giá BookVerse",
      sourceRating: book.sourceMetadata?.sourceRatingAverage ?? null,
      category: book.category?.name ?? null,
      isFavorite: book.favoriteBooks.length > 0,
    }));
  } catch (error: unknown) {
    // Database chưa apply migration G2 sẽ không có bảng metadata; Home vẫn hoạt động với khu vực cũ.
    logActionError("getCuratedBooks", error);
    return [];
  }
}

export async function getMarketplaceListings(): Promise<MarketplaceListing[]> {
  try {
    const listings = await prisma.listing.findMany({
      where: {
        status: ListingStatus.APPROVED,
        stock: {
          gt: 0,
        },
        book: {
          is: {
            id: {
              startsWith: "RB",
            },
            sourceMetadata: {
              isNot: null,
            },
          },
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
