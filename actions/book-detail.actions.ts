"use server";

import { InteractionType, ListingStatus, TargetType } from "@prisma/client";
import { normalizeBookCoverUrl } from "@/lib/book-cover";
import { TAXONOMY_VERSION } from "@/lib/interaction-taxonomy";
import { getCurrentUser, PermissionError, requireAuthenticatedUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { publicBookQualityWhere, publicDemoBookWhere } from "@/lib/public-book-policy";

type DecimalLike = {
  toNumber: () => number;
};

export interface BookDetailReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {
    name: string;
  };
}

export interface BookDetail {
  id: string;
  title: string;
  author: string;
  description: string | null;
  coverImage: string | null;
  price: number;
  rating: number | null;
  pages: number | null;
  publishYear: number | null;
  format: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  availableListing: {
    id: string;
    price: number;
    condition: string;
  } | null;
  isFavorite: boolean;
  isInMembership: boolean;
  reviews: BookDetailReview[];
  sourceMetadata: {
    languages: string[];
    isbn: string | null;
    publisher: string | null;
    isVietnameseEdition: boolean;
  } | null;
}

export interface BookReviewResult {
  success: boolean;
  message: string;
  reason?: "AUTH_REQUIRED" | "VALIDATION_ERROR" | "NOT_FOUND" | "DATABASE_ERROR";
}

export interface RelatedBook {
  id: string;
  title: string;
  author: string;
  coverImage: string | null;
  price: number;
  category: string;
  catalogSource: "CURATED_REAL" | "SYNTHETIC_DEMO";
  metadataBadge?: string;
  priceLabel?: string;
  availableListingId?: string | null;
  isFavorite?: boolean;
}

function decimalToNumber(value: DecimalLike | number | string | null): number | null {
  if (value === null) {
    return null;
  }

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

export async function getBookById(id: string): Promise<BookDetail | null> {
  try {
    const currentUser = await getCurrentUser();
    const userId = currentUser && !currentUser.isLocked ? currentUser.id : null;
    const visibilityWhere = id.startsWith("RB") ? publicBookQualityWhere() : publicDemoBookWhere();
    const book = await prisma.book.findFirst({
      where: {
        AND: [{ id }, visibilityWhere],
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        reviews: {
          orderBy: {
            createdAt: "desc",
          },
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        listings: {
          where: {
            status: ListingStatus.APPROVED,
            stock: { gt: 0 },
          },
          orderBy: {
            price: "asc",
          },
          take: 1,
          select: {
            id: true,
            price: true,
            condition: true,
          },
        },
        sourceMetadata: {
          select: {
            languages: true,
            isbn: true,
            publisher: true,
            isVietnameseEdition: true,
          },
        },
      },
    });

    if (!book) {
      return null;
    }

    const favorite = userId
      ? await prisma.favoriteBook.findUnique({
          where: {
            userId_bookId: {
              userId,
              bookId: book.id,
            },
          },
          select: {
            id: true,
          },
        })
      : null;

    return {
      id: book.id,
      title: book.title,
      author: book.authorName,
        // Không phát lại mô tả nhập từ nguồn trên giao diện công khai.
        description: book.sourceMetadata ? null : book.description,
      coverImage: normalizeBookCoverUrl(book.coverPath),
      price: decimalToNumber(book.price) ?? 0,
      rating: decimalToNumber(book.rating),
      pages: book.pages,
      publishYear: book.publishYear,
      format: book.format,
      category: book.category,
      availableListing: book.listings[0]
        ? {
            id: book.listings[0].id,
            price: decimalToNumber(book.listings[0].price) ?? 0,
            condition: book.listings[0].condition,
          }
        : null,
      isFavorite: Boolean(favorite),
      // Mọi đầu sách đang hoạt động đều thuộc kho đọc của gói hội viên.
      isInMembership: book.status === "ACTIVE" && !book.deletedAt,
      reviews: book.reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.reviewText,
        createdAt: review.createdAt.toISOString(),
        user: {
          name: review.user.name,
        },
      })),
      sourceMetadata: book.sourceMetadata,
    };
  } catch (error: unknown) {
    logActionError("getBookById", error);
    return null;
  }
}

export async function getRelatedBooks(
  bookId: string,
  categoryId: string,
  isCurated: boolean,
): Promise<RelatedBook[]> {
  try {
    const currentUser = await getCurrentUser();
    const userId = currentUser && !currentUser.isLocked ? currentUser.id : null;
    const books = await prisma.book.findMany({
      where: {
        AND: [
          { id: { not: bookId } },
          { categoryId },
          isCurated ? publicBookQualityWhere() : publicDemoBookWhere(),
        ],
      },
      orderBy: [
        {
          rating: "desc",
        },
        {
          id: "asc",
        },
      ],
      take: 5,
      select: {
        id: true,
        title: true,
        authorName: true,
        coverPath: true,
        price: true,
        category: {
          select: {
            name: true,
          },
        },
        sourceMetadata: {
          select: {
            sourceProvider: true,
          },
        },
        listings: {
          where: {
            status: ListingStatus.APPROVED,
            stock: { gt: 0 },
          },
          orderBy: { price: "asc" },
          take: 1,
          select: { id: true },
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

    return books.map((book) => {
      const catalogSource = book.sourceMetadata ? "CURATED_REAL" : "SYNTHETIC_DEMO";

      return {
        id: book.id,
        title: book.title,
        author: book.authorName,
        coverImage: normalizeBookCoverUrl(book.coverPath),
        price: decimalToNumber(book.price) ?? 0,
        category: book.category.name,
        catalogSource,
        metadataBadge: catalogSource === "CURATED_REAL" ? "Sách tuyển chọn" : undefined,
        priceLabel: catalogSource === "CURATED_REAL" ? "Giá BookVerse" : undefined,
        availableListingId: book.listings[0]?.id ?? null,
        isFavorite: book.favoriteBooks.length > 0,
      };
    });
  } catch (error: unknown) {
    logActionError("getRelatedBooks", error);
    return [];
  }
}

function buildReviewId(): string {
  return `REVIEW-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

async function refreshBookRating(bookId: string): Promise<void> {
  const aggregate = await prisma.review.aggregate({
    where: {
      bookId,
    },
    _avg: {
      rating: true,
    },
  });

  await prisma.book.update({
    where: {
      id: bookId,
    },
    data: {
      rating: aggregate._avg.rating ? Number(aggregate._avg.rating.toFixed(2)) : null,
    },
  });
}

export async function createBookReview(
  bookId: string,
  rating: number,
  reviewText: string,
): Promise<BookReviewResult> {
  try {
    const userId = (await requireAuthenticatedUser()).id;
    const cleanBookId = bookId.trim();
    const safeRating = Math.min(Math.max(Math.floor(rating), 1), 5);
    const cleanReviewText = reviewText.trim();

    if (!cleanBookId) {
      return {
        success: false,
        message: "Thiếu mã sách.",
        reason: "VALIDATION_ERROR",
      };
    }

    if (!cleanReviewText) {
      return {
        success: false,
        message: "Vui lòng nhập nội dung đánh giá.",
        reason: "VALIDATION_ERROR",
      };
    }

    const book = await prisma.book.findUnique({
      where: {
        id: cleanBookId,
      },
      select: {
        id: true,
      },
    });

    if (!book) {
      return {
        success: false,
        message: "Không tìm thấy sách.",
        reason: "NOT_FOUND",
      };
    }

    const existingReview = await prisma.review.findFirst({
      where: {
        userId,
        bookId: cleanBookId,
      },
      select: {
        id: true,
      },
    });

    await prisma.$transaction([
      existingReview
        ? prisma.review.update({
            where: {
              id: existingReview.id,
            },
            data: {
              rating: safeRating,
              reviewText: cleanReviewText,
            },
          })
        : prisma.review.create({
            data: {
              id: buildReviewId(),
              userId,
              bookId: cleanBookId,
              rating: safeRating,
              reviewText: cleanReviewText,
            },
          }),
      prisma.interactionEvent.create({
        data: {
          userId,
          bookId: cleanBookId,
          actionType: "REVIEW_CREATE",
          metadata: {
            rating: safeRating,
            source: "book_detail",
            taxonomyVersion: TAXONOMY_VERSION,
          },
        },
      }),
      prisma.interaction.create({
        data: {
          id: `REVIEW-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
          userId,
          bookId: cleanBookId,
          type: InteractionType.REVIEW,
          targetType: TargetType.BOOK,
          targetId: cleanBookId,
          value: safeRating,
          metadata: {
            source: "book_detail",
          },
        },
      }),
    ]);

    await refreshBookRating(cleanBookId);

    return {
      success: true,
      message: existingReview ? "Đã cập nhật đánh giá của bạn." : "Đã gửi đánh giá sách.",
    };
  } catch (error: unknown) {
    if (error instanceof PermissionError) {
      return {
        success: false,
        message: error.message,
        reason: "AUTH_REQUIRED",
      };
    }

    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[createBookReview] ${message}`);
    return {
      success: false,
      message: "Không thể lưu đánh giá. Vui lòng thử lại.",
      reason: "DATABASE_ERROR",
    };
  }
}
