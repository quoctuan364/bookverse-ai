"use server";

import { revalidatePath } from "next/cache";
import { CoverReviewStatus, Prisma } from "@prisma/client";

import { recordAuditLog } from "@/lib/audit";
import { normalizeLanguageAlias } from "@/lib/book-language";
import {
  expectedLocalCoverPath,
  inspectLocalBookCover,
} from "@/lib/local-cover-quality";
import { requireModeratorUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export type DataQualityIssueFilter =
  | "all"
  | "cover"
  | "language"
  | "isbn"
  | "description"
  | "hidden";

export interface DataQualityMetrics {
  totalBooks: number;
  vietnameseBooks: number;
  englishBooks: number;
  otherLanguageBooks: number;
  missingLanguage: number;
  verifiedCovers: number;
  needsCoverReview: number;
  missingIsbn: number;
  missingDescription: number;
  publiclyVisible: number;
  coverCompletionRate: number;
}

export interface DataQualityBookItem {
  id: string;
  title: string;
  author: string;
  coverPath: string;
  languageCode: string | null;
  coverReviewStatus: CoverReviewStatus;
  isPubliclyVisible: boolean;
  missingIsbn: boolean;
  missingDescription: boolean;
  isbn: string | null;
  updatedAt: Date;
}

export interface DataQualityPageData {
  metrics: DataQualityMetrics;
  books: DataQualityBookItem[];
  page: number;
  pageSize: number;
  totalIssues: number;
  totalPages: number;
}

export interface DataQualityFilters {
  issue?: DataQualityIssueFilter;
  query?: string;
  page?: number;
}

export interface DataQualityActionResult {
  success: boolean;
  message: string;
}

const PAGE_SIZE = 25;
const ALLOWED_LANGUAGE_CODES = new Set([
  "vi",
  "en",
  "es",
  "fr",
  "de",
  "id",
  "it",
  "pt",
  "ja",
  "zh",
]);

function issueWhere(issue: DataQualityIssueFilter): Prisma.BookWhereInput {
  switch (issue) {
    case "cover":
      return { coverReviewStatus: CoverReviewStatus.NEEDS_COVER_REVIEW };
    case "language":
      return { languageCode: null };
    case "isbn":
      return {
        OR: [
          { sourceMetadata: { is: { isbn: null } } },
          { sourceMetadata: { is: { isbn: "" } } },
        ],
      };
    case "description":
      return { OR: [{ description: null }, { description: "" }] };
    case "hidden":
      return { isPubliclyVisible: false };
    default:
      return {
        OR: [
          { coverReviewStatus: CoverReviewStatus.NEEDS_COVER_REVIEW },
          { languageCode: null },
          { description: null },
          { description: "" },
          { sourceMetadata: { is: { isbn: null } } },
          { sourceMetadata: { is: { isbn: "" } } },
          { isPubliclyVisible: false },
        ],
      };
  }
}

function refreshDataQualityPages(): void {
  revalidatePath("/admin/data-quality");
  revalidatePath("/catalog");
  revalidatePath("/marketplace");
  revalidatePath("/");
}

export async function getDataQualityPageData(
  filters: DataQualityFilters = {},
): Promise<DataQualityPageData> {
  await requireModeratorUser();

  const issue = filters.issue ?? "all";
  const query = filters.query?.trim();
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const realBookWhere: Prisma.BookWhereInput = {
    id: { startsWith: "RB" },
    sourceMetadata: { isNot: null },
  };
  const listWhere: Prisma.BookWhereInput = {
    AND: [
      realBookWhere,
      issueWhere(issue),
      ...(query
        ? [
            {
              OR: [
                { id: { contains: query, mode: Prisma.QueryMode.insensitive } },
                { title: { contains: query, mode: Prisma.QueryMode.insensitive } },
                { authorName: { contains: query, mode: Prisma.QueryMode.insensitive } },
              ],
            } satisfies Prisma.BookWhereInput,
          ]
        : []),
    ],
  };

  const [
    totalBooks,
    vietnameseBooks,
    englishBooks,
    otherLanguageBooks,
    missingLanguage,
    verifiedCovers,
    needsCoverReview,
    missingIsbn,
    missingDescription,
    publiclyVisible,
    totalIssues,
    books,
  ] = await Promise.all([
    prisma.book.count({ where: realBookWhere }),
    prisma.book.count({ where: { ...realBookWhere, languageCode: "vi" } }),
    prisma.book.count({ where: { ...realBookWhere, languageCode: "en" } }),
    prisma.book.count({
      where: {
        ...realBookWhere,
        languageCode: { not: null, notIn: ["vi", "en"] },
      },
    }),
    prisma.book.count({ where: { ...realBookWhere, languageCode: null } }),
    prisma.book.count({
      where: { ...realBookWhere, coverReviewStatus: CoverReviewStatus.VERIFIED_LOCAL },
    }),
    prisma.book.count({
      where: { ...realBookWhere, coverReviewStatus: CoverReviewStatus.NEEDS_COVER_REVIEW },
    }),
    prisma.book.count({
      where: {
        AND: [
          realBookWhere,
          {
            OR: [
              { sourceMetadata: { is: { isbn: null } } },
              { sourceMetadata: { is: { isbn: "" } } },
            ],
          },
        ],
      },
    }),
    prisma.book.count({
      where: {
        AND: [realBookWhere, { OR: [{ description: null }, { description: "" }] }],
      },
    }),
    prisma.book.count({ where: { ...realBookWhere, isPubliclyVisible: true } }),
    prisma.book.count({ where: listWhere }),
    prisma.book.findMany({
      where: listWhere,
      orderBy: [
        { coverReviewStatus: "desc" },
        { isPubliclyVisible: "asc" },
        { updatedAt: "desc" },
        { id: "asc" },
      ],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        authorName: true,
        coverPath: true,
        languageCode: true,
        coverReviewStatus: true,
        isPubliclyVisible: true,
        description: true,
        updatedAt: true,
        sourceMetadata: { select: { isbn: true } },
      },
    }),
  ]);

  return {
    metrics: {
      totalBooks,
      vietnameseBooks,
      englishBooks,
      otherLanguageBooks,
      missingLanguage,
      verifiedCovers,
      needsCoverReview,
      missingIsbn,
      missingDescription,
      publiclyVisible,
      coverCompletionRate:
        totalBooks > 0 ? Number(((verifiedCovers / totalBooks) * 100).toFixed(2)) : 0,
    },
    books: books.map((book) => ({
      id: book.id,
      title: book.title,
      author: book.authorName,
      coverPath: expectedLocalCoverPath(book.id),
      languageCode: book.languageCode,
      coverReviewStatus: book.coverReviewStatus,
      isPubliclyVisible: book.isPubliclyVisible,
      missingIsbn: !book.sourceMetadata?.isbn?.trim(),
      missingDescription: !book.description?.trim(),
      isbn: book.sourceMetadata?.isbn ?? null,
      updatedAt: book.updatedAt,
    })),
    page,
    pageSize: PAGE_SIZE,
    totalIssues,
    totalPages: Math.max(1, Math.ceil(totalIssues / PAGE_SIZE)),
  };
}

export async function updateBookCoverQuality(
  bookId: string,
  coverPath: string,
): Promise<DataQualityActionResult> {
  try {
    const actor = await requireModeratorUser();
    const cleanBookId = bookId.trim();
    const expectedPath = expectedLocalCoverPath(cleanBookId);
    if (coverPath.trim() !== expectedPath) {
      return {
        success: false,
        message: `Chỉ chấp nhận bìa đúng sách tại ${expectedPath}.`,
      };
    }

    const inspection = await inspectLocalBookCover(cleanBookId);
    if (!inspection.valid) {
      await prisma.book.update({
        where: { id: cleanBookId },
        data: {
          coverReviewStatus: CoverReviewStatus.NEEDS_COVER_REVIEW,
          isPubliclyVisible: false,
        },
      });
      refreshDataQualityPages();
      return {
        success: false,
        message: `Bìa chưa hợp lệ: ${inspection.reason ?? "UNKNOWN"}. Sách đã được ẩn an toàn.`,
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.book.update({
        where: { id: cleanBookId },
        data: {
          coverPath: inspection.relativePath,
          coverReviewStatus: CoverReviewStatus.VERIFIED_LOCAL,
          isPubliclyVisible: false,
        },
      });
      await recordAuditLog(
        {
          actorId: actor.id,
          action: "DATA_QUALITY_COVER_VERIFIED",
          entityType: "BOOK",
          entityId: cleanBookId,
          metadata: { coverPath: inspection.relativePath },
        },
        tx,
      );
    });
    refreshDataQualityPages();
    return { success: true, message: "Đã kiểm tra bìa. Hãy duyệt hiển thị sách." };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể cập nhật bìa.",
    };
  }
}

export async function updateBookLanguageQuality(
  bookId: string,
  languageCode: string,
): Promise<DataQualityActionResult> {
  try {
    const actor = await requireModeratorUser();
    const cleanBookId = bookId.trim();
    const normalized = normalizeLanguageAlias(languageCode);
    if (!normalized || !ALLOWED_LANGUAGE_CODES.has(normalized)) {
      return { success: false, message: "Mã ngôn ngữ không nằm trong danh sách được hỗ trợ." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.book.update({
        where: { id: cleanBookId },
        data: { languageCode: normalized },
      });
      await tx.bookEdition.updateMany({
        where: { bookId: cleanBookId },
        data: { languageCode: normalized },
      });
      await recordAuditLog(
        {
          actorId: actor.id,
          action: "DATA_QUALITY_LANGUAGE_UPDATED",
          entityType: "BOOK",
          entityId: cleanBookId,
          metadata: { languageCode: normalized },
        },
        tx,
      );
    });
    refreshDataQualityPages();
    return { success: true, message: `Đã đổi ngôn ngữ thành ${normalized}.` };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể sửa ngôn ngữ.",
    };
  }
}

export async function setBookPublicVisibility(
  bookId: string,
  visible: boolean,
): Promise<DataQualityActionResult> {
  try {
    const actor = await requireModeratorUser();
    const cleanBookId = bookId.trim();
    const book = await prisma.book.findUnique({
      where: { id: cleanBookId },
      select: { coverReviewStatus: true },
    });
    if (!book) return { success: false, message: "Không tìm thấy sách." };

    if (visible) {
      const inspection = await inspectLocalBookCover(cleanBookId);
      if (
        book.coverReviewStatus !== CoverReviewStatus.VERIFIED_LOCAL ||
        !inspection.valid
      ) {
        await prisma.book.update({
          where: { id: cleanBookId },
          data: {
            coverReviewStatus: CoverReviewStatus.NEEDS_COVER_REVIEW,
            isPubliclyVisible: false,
          },
        });
        refreshDataQualityPages();
        return { success: false, message: "Không thể duyệt: bìa local chưa hợp lệ." };
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.book.update({
        where: { id: cleanBookId },
        data: { isPubliclyVisible: visible },
      });
      await recordAuditLog(
        {
          actorId: actor.id,
          action: visible ? "DATA_QUALITY_PUBLIC_APPROVED" : "DATA_QUALITY_PUBLIC_HIDDEN",
          entityType: "BOOK",
          entityId: cleanBookId,
        },
        tx,
      );
    });
    refreshDataQualityPages();
    return {
      success: true,
      message: visible ? "Đã duyệt sách lên gian hàng." : "Đã ẩn sách khỏi gian hàng.",
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể đổi trạng thái hiển thị.",
    };
  }
}
