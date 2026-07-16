"use server";

import { revalidatePath } from "next/cache";
import { InteractionType, OrderStatus, TargetType } from "@prisma/client";
import { normalizeBookCoverUrl } from "@/lib/book-cover";
import { TAXONOMY_VERSION } from "@/lib/interaction-taxonomy";
import prisma from "@/lib/prisma";
import { PermissionError, requireAuthenticatedUser } from "@/lib/permissions";

type DecimalLike = {
  toNumber: () => number;
};

export interface LibraryBookItem {
  bookId: string;
  title: string;
  author: string;
  coverImage: string | null;
}

export interface LibraryReadingItem extends LibraryBookItem {
  currentPage: number;
  progressPercent: number;
  totalMinutes: number;
  lastReadAt: Date | null;
}

export interface LibraryPurchasedItem extends LibraryBookItem {
  orderId: string;
  status: string;
  totalPrice: number;
  purchasedAt: Date;
}

export interface LibraryFavoriteItem extends LibraryBookItem {
  favoriteId: string;
  createdAt: Date;
}

export interface LibraryBookmarkItem extends LibraryBookItem {
  bookmarkId: string;
  pageNumber: number;
  createdAt: Date;
}

export interface LibraryHighlightItem extends LibraryBookItem {
  highlightId: string;
  pageNumber: number;
  text: string;
  note: string | null;
  createdAt: Date;
}

export interface LibraryData {
  reading: LibraryReadingItem[];
  purchased: LibraryPurchasedItem[];
  favorites: LibraryFavoriteItem[];
  bookmarks: LibraryBookmarkItem[];
  highlights: LibraryHighlightItem[];
}

export interface FavoriteActionResult {
  success: boolean;
  message: string;
  isFavorite?: boolean;
  reason?: "AUTH_REQUIRED" | "VALIDATION_ERROR" | "NOT_FOUND" | "DATABASE_ERROR";
}

const paidOrderStatuses = [
  OrderStatus.PAID,
  OrderStatus.PAID_DEMO,
  OrderStatus.SHIPPED,
  OrderStatus.COMPLETED,
];

function decimalToNumber(value: DecimalLike | number | string): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value.toNumber();
}

function serializeBook(book: { id: string; title: string; authorName: string; coverPath: string | null }) {
  return {
    bookId: book.id,
    title: book.title,
    author: book.authorName,
    coverImage: normalizeBookCoverUrl(book.coverPath),
  };
}

function handleFavoriteError(error: unknown, fallbackMessage: string): FavoriteActionResult {
  if (error instanceof PermissionError) {
    return {
      success: false,
      message: error.message,
      reason: "AUTH_REQUIRED",
    };
  }

  const message = error instanceof Error ? error.message : "Lỗi không xác định.";
  console.error(`[favorite] ${message}`);

  return {
    success: false,
    message: fallbackMessage,
    reason: "DATABASE_ERROR",
  };
}

export async function getLibraryData(): Promise<LibraryData> {
  const user = await requireAuthenticatedUser();

  const [reading, purchasedItems, favorites, bookmarks, highlights] = await Promise.all([
    prisma.readingProgress.findMany({
      where: {
        userId: user.id,
      },
      orderBy: [
        {
          lastReadAt: "desc",
        },
        {
          updatedAt: "desc",
        },
      ],
      take: 12,
      include: {
        book: {
          select: {
            id: true,
            title: true,
            authorName: true,
            coverPath: true,
          },
        },
      },
    }),
    prisma.orderItem.findMany({
      where: {
        order: {
          buyerId: user.id,
          status: {
            in: paidOrderStatuses,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 16,
      include: {
        book: {
          select: {
            id: true,
            title: true,
            authorName: true,
            coverPath: true,
          },
        },
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.favoriteBook.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 16,
      include: {
        book: {
          select: {
            id: true,
            title: true,
            authorName: true,
            coverPath: true,
          },
        },
      },
    }),
    prisma.bookmark.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 16,
      include: {
        book: {
          select: {
            id: true,
            title: true,
            authorName: true,
            coverPath: true,
          },
        },
      },
    }),
    prisma.highlight.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      include: {
        book: {
          select: {
            id: true,
            title: true,
            authorName: true,
            coverPath: true,
          },
        },
      },
    }),
  ]);

  return {
    reading: reading.map((item) => ({
      ...serializeBook(item.book),
      currentPage: item.currentPage,
      progressPercent: item.progressPercent,
      totalMinutes: item.totalMinutes,
      lastReadAt: item.lastReadAt,
    })),
    purchased: purchasedItems.map((item) => ({
      ...serializeBook(item.book),
      orderId: item.order.id,
      status: item.order.status,
      totalPrice: decimalToNumber(item.totalPrice),
      purchasedAt: item.order.createdAt,
    })),
    favorites: favorites.map((item) => ({
      ...serializeBook(item.book),
      favoriteId: item.id,
      createdAt: item.createdAt,
    })),
    bookmarks: bookmarks.map((item) => ({
      ...serializeBook(item.book),
      bookmarkId: item.id,
      pageNumber: item.pageNumber,
      createdAt: item.createdAt,
    })),
    highlights: highlights.map((item) => ({
      ...serializeBook(item.book),
      highlightId: item.id,
      pageNumber: item.pageNumber,
      text: item.text,
      note: item.note,
      createdAt: item.createdAt,
    })),
  };
}

export async function toggleFavoriteBook(bookId: string): Promise<FavoriteActionResult> {
  try {
    const user = await requireAuthenticatedUser();
    const cleanBookId = bookId.trim();

    if (!cleanBookId) {
      return {
        success: false,
        message: "Thiếu mã sách.",
        reason: "VALIDATION_ERROR",
      };
    }

    const book = await prisma.book.findUnique({
      where: {
        id: cleanBookId,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!book) {
      return {
        success: false,
        message: "Không tìm thấy sách.",
        reason: "NOT_FOUND",
      };
    }

    const existingFavorite = await prisma.favoriteBook.findUnique({
      where: {
        userId_bookId: {
          userId: user.id,
          bookId: cleanBookId,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingFavorite) {
      await prisma.$transaction([
        prisma.favoriteBook.delete({
          where: {
            id: existingFavorite.id,
          },
        }),
        prisma.interactionEvent.create({
          data: {
            userId: user.id,
            bookId: cleanBookId,
            actionType: "FAVORITE_REMOVE",
            metadata: {
              source: "book_detail",
              taxonomyVersion: TAXONOMY_VERSION,
            },
          },
        }),
      ]);

      revalidatePath("/library");
      revalidatePath(`/book/${cleanBookId}`);

      return {
        success: true,
        message: `Đã bỏ yêu thích "${book.title}".`,
        isFavorite: false,
      };
    }

    await prisma.$transaction([
      prisma.favoriteBook.create({
        data: {
          userId: user.id,
          bookId: cleanBookId,
        },
      }),
      prisma.interactionEvent.create({
        data: {
          userId: user.id,
          bookId: cleanBookId,
          actionType: "FAVORITE_ADD",
          metadata: {
            source: "book_detail",
            taxonomyVersion: TAXONOMY_VERSION,
          },
        },
      }),
      prisma.interaction.create({
        data: {
          id: `FAVORITE-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
          userId: user.id,
          bookId: cleanBookId,
          type: InteractionType.LIKE,
          targetType: TargetType.BOOK,
          targetId: cleanBookId,
          metadata: {
            source: "book_detail",
            action: "favorite",
          },
        },
      }),
    ]);

    revalidatePath("/library");
    revalidatePath(`/book/${cleanBookId}`);

    return {
      success: true,
      message: `Đã thêm "${book.title}" vào yêu thích.`,
      isFavorite: true,
    };
  } catch (error: unknown) {
    return handleFavoriteError(error, "Không thể cập nhật sách yêu thích.");
  }
}
