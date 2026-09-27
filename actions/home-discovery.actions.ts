"use server";

import { unstable_cache } from "next/cache";
import { normalizeBookCoverUrl } from "@/lib/book-cover";
import { getVietnameseBookTitle } from "@/lib/book-display-title";
import { normalizeBookPrice } from "@/lib/book-display-price";
import {
  rankTrendingBooks,
  uniqueRecentlyViewedBookIds,
  type HomeDiscoverySignal,
} from "@/lib/home-discovery";
import { getCurrentUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import {
  catalogBookQualityWhere,
  isDemoCatalogExperienceEnabled,
  publicBookQualityWhere,
} from "@/lib/public-book-policy";

type DecimalLike = {
  toNumber: () => number;
};

export interface HomeDiscoveryBook {
  id: string;
  title: string;
  author: string;
  category: string | null;
  coverImage: string | null;
  price: number;
  availableListingId: string | null;
  isFavorite: boolean;
}

export interface ContinueReadingBook extends HomeDiscoveryBook {
  currentPage: number;
  currentChapter: number;
  progressPercent: number;
  totalMinutes: number;
  lastReadAt: Date | null;
}

export interface TrendingBook extends HomeDiscoveryBook {
  trendPosition: number;
  trendScore: number | null;
  trendLabel: string;
}

export interface HomeDiscoveryData {
  continueReading: ContinueReadingBook | null;
  recentlyViewed: HomeDiscoveryBook[];
  trending: TrendingBook[];
  isPersonalized: boolean;
}

export interface HomePlatformStats {
  activeBooks: number;
  readableBooks: number;
  categories: number;
  approvedListings: number;
  spotlightBooks: Array<{
    id: string;
    title: string;
    author: string;
    coverImage: string | null;
  }>;
}

/**
 * Các con số trên trang chủ được đếm trực tiếp từ database để không hiển thị
 * số liệu quảng cáo giả trong buổi demo.
 */
async function _getHomePlatformStats(): Promise<HomePlatformStats | null> {
  try {
    const hasPublicRealCatalog =
      (await prisma.book.findFirst({ where: publicBookQualityWhere(), select: { id: true } })) !==
      null;
    const publicWhere = catalogBookQualityWhere(hasPublicRealCatalog);
    const [activeBooks, readableBooks, categories, approvedListings, spotlightBooks] =
      await Promise.all([
        prisma.book.count({ where: publicWhere }),
        prisma.book.count({
          where: {
            ...publicWhere,
            chunks: { some: {} },
          },
        }),
        prisma.category.count({
          where: {
            books: { some: publicWhere },
          },
        }),
        prisma.listing.count({
          where: {
            status: "APPROVED",
            stock: { gt: 0 },
            book: { is: publicWhere },
          },
        }),
        prisma.book.findMany({
          where: {
            ...publicWhere,
            chunks: { some: {} },
          },
          orderBy: [{ rating: "desc" }, { title: "asc" }],
          take: 5,
          select: {
            id: true,
            title: true,
            authorName: true,
            coverPath: true,
          },
        }),
      ]);

    return {
      activeBooks,
      readableBooks,
      categories,
      approvedListings,
      spotlightBooks: spotlightBooks.map((book) => ({
        id: book.id,
        title: getVietnameseBookTitle(book.id, book.title),
        author: book.authorName,
        coverImage: normalizeBookCoverUrl(book.coverPath),
      })),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[getHomePlatformStats] ${message.slice(0, 180)}`);
    return null;
  }
}

/**
 * Số liệu thống kê trang chủ được cache 5 phút — không cần real-time.
 */
const getCachedHomePlatformStats = unstable_cache(
  async (catalogMode: "demo" | "real" | "public") => {
    void catalogMode; // Tham số được unstable_cache dùng để phân biệt bộ dữ liệu.
    return _getHomePlatformStats();
  },
  ["home-platform-stats"],
  { revalidate: 300, tags: ["home-shelves"] },
);

/**
 * Chế độ catalog là một phần của khóa cache. Nhờ vậy số lượng sách không bị
 * giữ ở 0 khi chuyển từ cấu hình production sang môi trường demo.
 */
export async function getHomePlatformStats(): Promise<HomePlatformStats | null> {
  const hasPublicRealCatalog =
    (await prisma.book.findFirst({ where: publicBookQualityWhere(), select: { id: true } })) !==
    null;
  const catalogMode = hasPublicRealCatalog
    ? "real"
    : isDemoCatalogExperienceEnabled()
      ? "demo"
      : "public";
  return getCachedHomePlatformStats(catalogMode);
}

const bookSelect = {
  id: true,
  title: true,
  authorName: true,
  coverPath: true,
  price: true,
  category: { select: { name: true } },
  listings: {
    where: { status: "APPROVED" as const, stock: { gt: 0 } },
    orderBy: { price: "asc" as const },
    take: 1,
    select: { id: true },
  },
} as const;

function serializeBook(
  book: {
    id: string;
    title: string;
    authorName: string;
    coverPath: string | null;
    price: DecimalLike | number | string;
    category: { name: string } | null;
    listings: Array<{ id: string }>;
  },
  favoriteBookIds: Set<string>,
): HomeDiscoveryBook {
  return {
    id: book.id,
    title: getVietnameseBookTitle(book.id, book.title),
    author: book.authorName,
    category: book.category?.name ?? null,
    coverImage: normalizeBookCoverUrl(book.coverPath),
    price: normalizeBookPrice(book.price),
    availableListingId: book.listings[0]?.id ?? null,
    isFavorite: favoriteBookIds.has(book.id),
  };
}

export async function getHomeDiscoveryData(): Promise<HomeDiscoveryData> {
  try {
    const currentUser = await getCurrentUser();
    const userId = currentUser && !currentUser.isLocked ? currentUser.id : null;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1_000);
    const hasPublicRealCatalog =
      (await prisma.book.findFirst({ where: publicBookQualityWhere(), select: { id: true } })) !==
      null;
    const publicWhere = catalogBookQualityWhere(hasPublicRealCatalog);

    const [continueProgress, recentSignals, weeklySignals] = await Promise.all([
      userId
        ? prisma.readingProgress.findFirst({
            where: {
              userId,
              progressPercent: { gt: 0, lt: 100 },
              book: {
                ...publicWhere,
                chunks: { some: {} },
              },
            },
            orderBy: [{ lastReadAt: "desc" }, { updatedAt: "desc" }],
            include: { book: { select: bookSelect } },
          })
        : null,
      userId
        ? prisma.interactionEvent.findMany({
            where: {
              userId,
              actionType: "BOOK_VIEW",
              book: publicWhere,
            },
            orderBy: { createdAt: "desc" },
            take: 40,
            select: { bookId: true, actionType: true, createdAt: true },
          })
        : [],
      prisma.interactionEvent.findMany({
        where: {
          createdAt: { gte: sevenDaysAgo },
          actionType: {
            in: [
              "BOOK_VIEW",
              "READING_START",
              "READING_PROGRESS",
              "READING_COMPLETE",
              "BOOKMARK_ADD",
              "FAVORITE_ADD",
              "CART_ADD",
              "PURCHASE",
              "REVIEW_CREATE",
            ],
          },
          book: publicWhere,
        },
        orderBy: { createdAt: "desc" },
        take: 5_000,
        select: { bookId: true, actionType: true, createdAt: true },
      }),
    ]);

    const recentIds = uniqueRecentlyViewedBookIds(recentSignals, 6).filter(
      (bookId) => bookId !== continueProgress?.bookId,
    );
    const rankedTrending = rankTrendingBooks(weeklySignals as HomeDiscoverySignal[], now, 20);
    const rankedIds = rankedTrending.map((item) => item.bookId);

    const [recentBooks, rankedBooks, fallbackTrending] = await Promise.all([
      recentIds.length
        ? prisma.book.findMany({
            where: { ...publicWhere, id: { in: recentIds } },
            select: bookSelect,
          })
        : [],
      rankedIds.length
        ? prisma.book.findMany({
            where: { ...publicWhere, id: { in: rankedIds } },
            select: bookSelect,
          })
        : [],
      prisma.book.findMany({
        where: publicWhere,
        orderBy: [
          { sourceMetadata: { sourceRatingAverage: { sort: "desc", nulls: "last" } } },
          { title: "asc" },
        ],
        take: 10,
        select: bookSelect,
      }),
    ]);

    const orderedRecentBooks = recentIds
      .map((bookId) => recentBooks.find((book) => book.id === bookId))
      .filter((book): book is NonNullable<typeof book> => Boolean(book));
    const orderedRankedBooks = rankedIds
      .map((bookId) => rankedBooks.find((book) => book.id === bookId))
      .filter((book): book is NonNullable<typeof book> => Boolean(book));
    const trendingCandidates = [...orderedRankedBooks];
    for (const book of fallbackTrending) {
      if (!trendingCandidates.some((candidate) => candidate.id === book.id)) {
        trendingCandidates.push(book);
      }
      if (trendingCandidates.length >= 5) break;
    }

    const allBookIds = [
      continueProgress?.bookId,
      ...orderedRecentBooks.map((book) => book.id),
      ...trendingCandidates.slice(0, 5).map((book) => book.id),
    ].filter((bookId): bookId is string => Boolean(bookId));
    const favorites = userId
      ? await prisma.favoriteBook.findMany({
          where: { userId, bookId: { in: allBookIds } },
          select: { bookId: true },
        })
      : [];
    const favoriteBookIds = new Set(favorites.map((favorite) => favorite.bookId));
    const trendingScoreByBookId = new Map(
      rankedTrending.map((item) => [item.bookId, item]),
    );

    return {
      continueReading: continueProgress
        ? {
            ...serializeBook(continueProgress.book, favoriteBookIds),
            currentPage: continueProgress.currentPage,
            currentChapter: continueProgress.currentChapter,
            progressPercent: continueProgress.progressPercent,
            totalMinutes: continueProgress.totalMinutes,
            lastReadAt: continueProgress.lastReadAt,
          }
        : null,
      recentlyViewed: orderedRecentBooks.map((book) =>
        serializeBook(book, favoriteBookIds),
      ),
      trending: trendingCandidates.slice(0, 5).map((book, index) => {
        const signal = trendingScoreByBookId.get(book.id);
        return {
          ...serializeBook(book, favoriteBookIds),
          trendPosition: index + 1,
          trendScore: signal?.score ?? null,
          trendLabel: signal
            ? "Đang được quan tâm trong 7 ngày"
            : "Nổi bật trong danh mục sách BookVerse",
        };
      }),
      isPersonalized: Boolean(userId),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[getHomeDiscoveryData] ${message.slice(0, 180)}`);
    return {
      continueReading: null,
      recentlyViewed: [],
      trending: [],
      isPersonalized: false,
    };
  }
}
