"use server";

import { unstable_cache } from "next/cache";
import { normalizeBookCoverUrl } from "@/lib/book-cover";
import { getVietnameseBookTitle } from "@/lib/book-display-title";
import { normalizeBookPrice } from "@/lib/book-display-price";
import { rankTrendingBooks, type HomeDiscoverySignal } from "@/lib/home-discovery";
import type {
  HomeContinueReadingBook,
  HomeGenreShelf,
  HomeShelfBook,
  HomeShelfResult,
} from "@/lib/home-shelf-types";
import { getCurrentUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import {
  catalogBookQualityWhere,
  publicBookQualityWhere,
} from "@/lib/public-book-policy";

type DecimalLike = { toNumber: () => number };

const homeBookSelect = {
  id: true,
  title: true,
  authorName: true,
  coverPath: true,
  price: true,
  category: { select: { name: true } },
  sourceMetadata: {
    select: { sourceRatingAverage: true, sourceRatingCount: true },
  },
  listings: {
    where: { status: "APPROVED" as const, stock: { gt: 0 } },
    orderBy: { price: "asc" as const },
    take: 1,
    select: { id: true },
  },
} as const;

type HomeBookRow = {
  id: string;
  title: string;
  authorName: string;
  coverPath: string | null;
  price: DecimalLike | number | string;
  category: { name: string } | null;
  sourceMetadata: {
    sourceRatingAverage: number | null;
    sourceRatingCount: number | null;
  } | null;
  listings: Array<{ id: string }>;
};

function serializeBook(book: HomeBookRow): HomeShelfBook {
  return {
    id: book.id,
    title: getVietnameseBookTitle(book.id, book.title),
    author: book.authorName,
    category: book.category?.name ?? null,
    coverImage: normalizeBookCoverUrl(book.coverPath),
    price: normalizeBookPrice(book.price),
    sourceRating: book.sourceMetadata?.sourceRatingAverage ?? null,
    ratingCount: book.sourceMetadata?.sourceRatingCount ?? null,
    availableListingId: book.listings[0]?.id ?? null,
    isFavorite: false,
  };
}

function failedShelf(message: string): HomeShelfResult {
  return { books: [], error: message };
}

async function loadPopularBooks(
  publicWhere: ReturnType<typeof catalogBookQualityWhere>,
): Promise<HomeShelfResult> {
  const signals = await prisma.interactionEvent.findMany({
    where: {
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
    // 500 tín hiệu gần nhất đủ để rank trending, giảm 90% data transfer so với 5_000.
    take: 500,
    select: { bookId: true, actionType: true, createdAt: true },
  });

  const rankedIds = rankTrendingBooks(signals as HomeDiscoverySignal[], new Date(), 30).map(
    (item) => item.bookId,
  );
  if (rankedIds.length === 0) return { books: [], error: null };

  const rows = await prisma.book.findMany({
    where: { ...publicWhere, id: { in: rankedIds } },
    select: homeBookSelect,
  });
  const rowById = new Map(rows.map((row) => [row.id, row]));
  return {
    books: rankedIds
      .map((id) => rowById.get(id))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .map(serializeBook),
    error: null,
  };
}

export interface HomeShelvesData {
  continueReading: HomeContinueReadingBook[];
  popular: HomeShelfResult;
  newest: HomeShelfResult;
  topRated: HomeShelfResult;
  readable: HomeShelfResult;
  genres: HomeGenreShelf[];
  genreError: string | null;
  databaseError: string | null;
}

/**
 * Nạp các kệ độc lập bằng truy vấn giới hạn. Promise.allSettled giúp một kệ lỗi
 * không làm cả Trang chủ trắng và không có truy vấn riêng cho từng BookCard.
 *
 * Kết quả popular được cache 5 phút để tránh query 500 interaction events mỗi request.
 */
const getCachedPopularBooks = unstable_cache(
  loadPopularBooks,
  ["home-popular-books"],
  { revalidate: 300, tags: ["home-shelves"] },
);

export async function getHomeShelvesData(): Promise<HomeShelvesData> {
  const empty: HomeShelvesData = {
    continueReading: [],
    popular: { books: [], error: null },
    newest: { books: [], error: null },
    topRated: { books: [], error: null },
    readable: { books: [], error: null },
    genres: [],
    genreError: null,
    databaseError: null,
  };

  try {
    const currentUser = await getCurrentUser();
    const userId = currentUser && !currentUser.isLocked ? currentUser.id : null;
    const hasPublicRealCatalog =
      (await prisma.book.count({ where: publicBookQualityWhere(), take: 1 })) > 0;
    const publicWhere = catalogBookQualityWhere(hasPublicRealCatalog);

    const tasks = await Promise.allSettled([
      getCachedPopularBooks(publicWhere),
      prisma.book.findMany({
        where: publicWhere,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        take: 30,
        select: homeBookSelect,
      }),
      prisma.book.findMany({
        where: {
          ...publicWhere,
          sourceMetadata: {
            is: {
              sourceRatingAverage: { not: null },
              sourceRatingCount: { gte: 5 },
            },
          },
        },
        orderBy: [
          { sourceMetadata: { sourceRatingAverage: { sort: "desc", nulls: "last" } } },
          { sourceMetadata: { sourceRatingCount: { sort: "desc", nulls: "last" } } },
          { id: "asc" },
        ],
        take: 30,
        select: homeBookSelect,
      }),
      prisma.book.findMany({
        where: { ...publicWhere, chunks: { some: {} } },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        take: 30,
        select: homeBookSelect,
      }),
      prisma.category.findMany({
        where: { books: { some: publicWhere } },
        orderBy: { name: "asc" },
        take: 8,
        select: {
          id: true,
          name: true,
          slug: true,
          canonicalKey: true,
          canonicalName: true,
          books: {
            where: publicWhere,
            orderBy: [{ createdAt: "desc" }, { id: "asc" }],
            take: 12,
            select: homeBookSelect,
          },
        },
      }),
      userId
        ? prisma.readingProgress.findMany({
            where: {
              userId,
              progressPercent: { gt: 0, lt: 100 },
              book: { ...publicWhere, chunks: { some: {} } },
            },
            orderBy: [{ lastReadAt: "desc" }, { updatedAt: "desc" }],
            take: 4,
            select: {
              currentPage: true,
              currentChapter: true,
              progressPercent: true,
              book: { select: homeBookSelect },
            },
          })
        : Promise.resolve([]),
    ]);

    const [popular, newest, topRated, readable, genres, continueReading] = tasks;

    return {
      continueReading:
        continueReading.status === "fulfilled"
          ? continueReading.value.map((item) => ({
              ...serializeBook(item.book),
              currentPage: item.currentPage,
              currentChapter: item.currentChapter,
              progressPercent: item.progressPercent,
            }))
          : [],
      popular:
        popular.status === "fulfilled"
          ? popular.value
          : failedShelf("Chưa thể tải dữ liệu quan tâm lúc này."),
      newest:
        newest.status === "fulfilled"
          ? { books: newest.value.map(serializeBook), error: null }
          : failedShelf("Chưa thể tải sách mới cập nhật."),
      topRated:
        topRated.status === "fulfilled"
          ? { books: topRated.value.map(serializeBook), error: null }
          : failedShelf("Chưa thể tải dữ liệu đánh giá."),
      readable:
        readable.status === "fulfilled"
          ? { books: readable.value.map(serializeBook), error: null }
          : failedShelf("Chưa thể tải kho sách có nội dung đọc."),
      genres:
        genres.status === "fulfilled"
          ? genres.value
              .map((genre) => ({
                id: genre.id,
                name: genre.canonicalName ?? genre.name,
                catalogKey: genre.canonicalKey ?? genre.slug,
                books: genre.books.map(serializeBook),
              }))
              .filter((genre) => genre.books.length > 0)
          : [],
      genreError:
        genres.status === "rejected" ? "Chưa thể tải danh sách thể loại." : null,
      databaseError: null,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error(`[getHomeShelvesData] ${message.slice(0, 180)}`);
    return {
      ...empty,
      databaseError:
        "BookVerse chưa kết nối được kho dữ liệu. Vui lòng thử tải lại sau ít phút.",
    };
  }
}
