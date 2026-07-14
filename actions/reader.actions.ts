"use server";

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { InteractionType, TargetType } from "@prisma/client";
import { TAXONOMY_VERSION } from "@/lib/interaction-taxonomy";
import { getCurrentUser, requireAuthenticatedUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export type ReaderActionType = "READ" | "BOOKMARK";

export interface ReaderActionResult {
  success: boolean;
  message: string;
}

export interface ReaderHighlight {
  id: string;
  pageNumber: number;
  text: string;
  note: string | null;
  createdAt: Date;
}

export interface ReaderInitialState {
  bookId: string;
  title: string;
  currentPage: number;
  progressPercent: number;
  bookmarks: number[];
  highlights: ReaderHighlight[];
}

export interface ReaderPageContent {
  pageNumber: number;
  content: string;
}

export interface ReaderBookContent {
  pages: ReaderPageContent[];
  sourceLabel: string;
  ebookUrl: string | null;
}

async function getCurrentUserId(): Promise<string> {
  const user = await requireAuthenticatedUser();
  return user.id;
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function toInteractionType(actionType: ReaderActionType | "HIGHLIGHT"): InteractionType {
  if (actionType === "BOOKMARK") {
    return InteractionType.BOOKMARK;
  }

  if (actionType === "HIGHLIGHT") {
    return InteractionType.HIGHLIGHT;
  }

  return InteractionType.READ;
}

function getNumericBookCode(bookId: string): string | null {
  const digits = bookId.match(/\d+/)?.[0];

  if (!digits) {
    return null;
  }

  return digits.padStart(4, "0").slice(-4);
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function htmlToPlainText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<\/(p|div|section|article|h1|h2|h3|li|blockquote)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

function splitTextIntoPages(text: string, pageSize = 1_250): ReaderPageContent[] {
  const cleanText = text.trim();

  if (!cleanText) {
    return [];
  }

  const paragraphs = cleanText
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const pages: string[] = [];
  let currentPage = "";

  for (const paragraph of paragraphs) {
    const candidate = currentPage ? `${currentPage}\n\n${paragraph}` : paragraph;

    if (candidate.length > pageSize && currentPage) {
      pages.push(currentPage);
      currentPage = paragraph;
    } else {
      currentPage = candidate;
    }
  }

  if (currentPage) {
    pages.push(currentPage);
  }

  return pages.map((content, index) => ({
    pageNumber: index + 1,
    content,
  }));
}

async function getFallbackContent(bookId: string): Promise<ReaderBookContent> {
  const book = await prisma.book.findUnique({
    where: {
      id: bookId,
    },
    select: {
      id: true,
      title: true,
      authorName: true,
      description: true,
      category: {
        select: {
          name: true,
        },
      },
    },
  });

  const title = book?.title ?? `Sách ${bookId}`;
  const author = book?.authorName ?? "BookVerse";
  const description =
    book?.description ??
    "Nội dung đọc trực tuyến đang được mô phỏng vì chưa tìm thấy file ebook tương ứng.";
  const seedText = [
    title,
    `Tác giả: ${author}`,
    book?.category.name ? `Thể loại: ${book.category.name}` : "",
    description,
    "BookVerse AI ghi nhận tiến độ đọc, phiên đọc, bookmark và highlight để phục vụ hệ gợi ý cá nhân hóa.",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    pages: splitTextIntoPages(seedText.repeat(4), 1_100),
    sourceLabel: "Nội dung fallback từ metadata sách",
    ebookUrl: null,
  };
}

export async function getReaderBookContent(bookId: string): Promise<ReaderBookContent> {
  try {
    const cleanBookId = bookId.trim();

    if (!cleanBookId) {
      return getFallbackContent("unknown-book");
    }

    const code = getNumericBookCode(cleanBookId);
    const candidates = [
      code ? `book-${code}.html` : null,
      `${cleanBookId}.html`,
      `${cleanBookId.toLowerCase()}.html`,
    ].filter((item): item is string => Boolean(item));

    for (const fileName of candidates) {
      const filePath = path.join(process.cwd(), "public", "ebooks", "html", fileName);

      if (!existsSync(filePath)) {
        continue;
      }

      const html = await readFile(filePath, "utf-8");
      const pages = splitTextIntoPages(htmlToPlainText(html));

      if (pages.length > 0) {
        return {
          pages,
          sourceLabel: `Ebook HTML: ${fileName}`,
          ebookUrl: `/ebooks/html/${fileName}`,
        };
      }
    }

    return getFallbackContent(cleanBookId);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Không thể tải nội dung ebook.";
    console.error(`[getReaderBookContent] ${message}`);
    return getFallbackContent(bookId);
  }
}

export async function getReaderInitialState(bookId: string): Promise<ReaderInitialState | null> {
  try {
    const currentUser = await getCurrentUser();
    const userId = currentUser && !currentUser.isLocked ? currentUser.id : null;
    const cleanBookId = bookId.trim();

    if (!cleanBookId) {
      return null;
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
      return null;
    }

    if (!userId) {
      return {
        bookId: book.id,
        title: book.title,
        currentPage: 1,
        progressPercent: 0,
        bookmarks: [],
        highlights: [],
      };
    }

    const [progress, bookmarks, highlights] = await Promise.all([
      prisma.readingProgress.findUnique({
        where: {
          userId_bookId: {
            userId,
            bookId: cleanBookId,
          },
        },
        select: {
          currentPage: true,
          progressPercent: true,
        },
      }),
      prisma.bookmark.findMany({
        where: {
          userId,
          bookId: cleanBookId,
        },
        orderBy: {
          pageNumber: "asc",
        },
        select: {
          pageNumber: true,
        },
      }),
      prisma.highlight.findMany({
        where: {
          userId,
          bookId: cleanBookId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
        select: {
          id: true,
          pageNumber: true,
          text: true,
          note: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      bookId: book.id,
      title: book.title,
      currentPage: Math.max(1, progress?.currentPage ?? 1),
      progressPercent: progress?.progressPercent ?? 0,
      bookmarks: bookmarks.map((bookmark) => bookmark.pageNumber),
      highlights,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Không thể tải trạng thái đọc.";
    console.error(`[getReaderInitialState] ${message}`);
    return null;
  }
}

export async function saveReadingProgress(
  bookId: string,
  currentPage: number,
  totalPages: number,
  timeSpent: number,
): Promise<ReaderActionResult> {
  try {
    const userId = await getCurrentUserId();
    const cleanBookId = bookId.trim();
    const safeTotalPages = Math.max(1, Math.floor(totalPages));
    const safeCurrentPage = clampNumber(Math.floor(currentPage), 1, safeTotalPages);
    const safeTimeSpent = Math.max(0, Math.floor(timeSpent));
    const progressPercent = Number(((safeCurrentPage / safeTotalPages) * 100).toFixed(2));
    const minutesRead = Math.ceil(safeTimeSpent / 60);

    if (!cleanBookId) {
      return { success: false, message: "Thiếu mã sách." };
    }

    await prisma.$transaction([
      prisma.readingProgress.upsert({
        where: {
          userId_bookId: {
            userId,
            bookId: cleanBookId,
          },
        },
        update: {
          currentPage: safeCurrentPage,
          progressPercent,
          totalMinutes: {
            increment: minutesRead,
          },
          lastReadAt: new Date(),
        },
        create: {
          userId,
          bookId: cleanBookId,
          currentPage: safeCurrentPage,
          progressPercent,
          totalMinutes: minutesRead,
          lastReadAt: new Date(),
        },
      }),
      prisma.readingSession.create({
        data: {
          userId,
          bookId: cleanBookId,
          currentPage: safeCurrentPage,
          progressPercent,
          timeSpent: safeTimeSpent,
        },
      }),
    ]);

    return { success: true, message: "Đã lưu tiến độ đọc." };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Không thể lưu tiến độ đọc.";
    console.error(`[saveReadingProgress] ${message}`);
    return { success: false, message };
  }
}

export async function toggleBookmark(
  bookId: string,
  pageNumber: number,
): Promise<ReaderActionResult> {
  try {
    const userId = await getCurrentUserId();
    const cleanBookId = bookId.trim();
    const safePageNumber = Math.max(1, Math.floor(pageNumber));

    if (!cleanBookId) {
      return { success: false, message: "Thiếu mã sách." };
    }

    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        userId_bookId_pageNumber: {
          userId,
          bookId: cleanBookId,
          pageNumber: safePageNumber,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingBookmark) {
      await prisma.$transaction([
        prisma.bookmark.delete({
          where: {
            id: existingBookmark.id,
          },
        }),
        prisma.interactionEvent.create({
          data: {
            userId,
            bookId: cleanBookId,
            actionType: "BOOKMARK_REMOVE",
            metadata: {
              pageNumber: safePageNumber,
              source: "online_reader",
              taxonomyVersion: TAXONOMY_VERSION,
            },
          },
        }),
      ]);

      return { success: true, message: "Đã bỏ đánh dấu trang." };
    }

    await prisma.bookmark.create({
      data: {
        userId,
        bookId: cleanBookId,
        pageNumber: safePageNumber,
      },
    });

    await logInteraction(cleanBookId, "BOOKMARK");

    return { success: true, message: "Đã đánh dấu trang." };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Không thể cập nhật bookmark.";
    console.error(`[toggleBookmark] ${message}`);
    return { success: false, message };
  }
}

export async function saveHighlight(
  bookId: string,
  pageNumber: number,
  text: string,
  note?: string,
): Promise<ReaderActionResult> {
  try {
    const userId = await getCurrentUserId();
    const cleanBookId = bookId.trim();
    const cleanText = text.trim();
    const cleanNote = note?.trim() || null;
    const safePageNumber = Math.max(1, Math.floor(pageNumber));

    if (!cleanBookId || !cleanText) {
      return {
        success: false,
        message: "Vui lòng nhập nội dung highlight.",
      };
    }

    await prisma.$transaction([
      prisma.highlight.create({
        data: {
          userId,
          bookId: cleanBookId,
          pageNumber: safePageNumber,
          text: cleanText,
          note: cleanNote,
        },
      }),
      prisma.interactionEvent.create({
        data: {
          userId,
          bookId: cleanBookId,
          actionType: "READING_HIGHLIGHT",
          metadata: {
            pageNumber: safePageNumber,
            note: cleanNote,
            source: "online_reader",
            taxonomyVersion: TAXONOMY_VERSION,
          },
        },
      }),
      prisma.interaction.create({
        data: {
          id: `HIGHLIGHT-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
          userId,
          bookId: cleanBookId,
          type: InteractionType.HIGHLIGHT,
          targetType: TargetType.BOOK,
          targetId: cleanBookId,
          metadata: {
            pageNumber: safePageNumber,
            source: "online_reader",
          },
        },
      }),
    ]);

    return {
      success: true,
      message: "Đã lưu highlight.",
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Không thể lưu highlight.";
    console.error(`[saveHighlight] ${message}`);
    return { success: false, message };
  }
}

export async function logInteraction(
  bookId: string,
  actionType: ReaderActionType,
): Promise<ReaderActionResult> {
  try {
    const userId = await getCurrentUserId();
    const cleanBookId = bookId.trim();

    if (!cleanBookId) {
      return { success: false, message: "Thiếu mã sách." };
    }

    await prisma.$transaction([
      prisma.interactionEvent.create({
        data: {
          userId,
          bookId: cleanBookId,
          actionType: actionType === "READ" ? "READING_START" : "BOOKMARK_ADD",
          metadata: {
            legacyEvent: actionType,
            source: "online_reader",
            taxonomyVersion: TAXONOMY_VERSION,
          },
        },
      }),
      prisma.interaction.create({
        data: {
          id: `READER-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
          userId,
          bookId: cleanBookId,
          type: toInteractionType(actionType),
          targetType: TargetType.BOOK,
          targetId: cleanBookId,
          metadata: {
            source: "online_reader",
          },
        },
      }),
    ]);

    return { success: true, message: "Đã lưu hành vi đọc." };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Không thể lưu hành vi đọc.";
    console.error(`[logInteraction] ${message}`);
    return { success: false, message };
  }
}
