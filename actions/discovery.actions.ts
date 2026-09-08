"use server";

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { normalizeBookCoverUrl } from "@/lib/book-cover";
import { getVietnameseBookTitle } from "@/lib/book-display-title";
import { publicExperienceBookWhere } from "@/lib/public-book-policy";

export type DiscoveryMood = "FOCUS" | "RELAX" | "INSPIRE" | "ADVENTURE";
export type DiscoveryLength = "SHORT" | "MEDIUM" | "LONG";
export type DiscoveryLanguage = "ALL" | "VI" | "EN" | "OTHER";
export type DiscoveryEra = "ALL" | "CLASSIC" | "MODERN" | "RECENT";

const moodKeywords: Record<DiscoveryMood, string[]> = {
  FOCUS: ["Kỹ thuật", "Khoa học", "Giáo trình", "Lập trình", "Cơ sở dữ liệu"],
  RELAX: ["Văn học", "Thiếu nhi", "Truyện tranh", "Đời sống"],
  INSPIRE: ["Kỹ năng", "Kinh doanh", "Tâm lý", "Thiết kế"],
  ADVENTURE: ["Du lịch", "Lịch sử", "Văn học nước ngoài", "Khoa học phổ thông"],
};

function pageFilter(length: DiscoveryLength): Prisma.IntNullableFilter {
  if (length === "SHORT") return { lte: 250 };
  if (length === "LONG") return { gte: 500 };
  return { gt: 250, lt: 500 };
}

function languageFilter(language: DiscoveryLanguage): Prisma.StringNullableFilter | undefined {
  if (language === "VI") return { startsWith: "vi", mode: "insensitive" };
  if (language === "EN") return { startsWith: "en", mode: "insensitive" };
  if (language === "OTHER") {
    return { notIn: ["vi", "vi-VN", "en", "en-US", "en-GB"] };
  }
  return undefined;
}

function publishYearFilter(era: DiscoveryEra): Prisma.IntNullableFilter | undefined {
  if (era === "CLASSIC") return { lte: 1999 };
  if (era === "MODERN") return { gte: 2000, lte: 2019 };
  if (era === "RECENT") return { gte: 2020 };
  return undefined;
}

export async function getDiscoveryFilterOptions() {
  const categories = await prisma.category.findMany({
    where: {
      books: { some: publicExperienceBookWhere() },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
    take: 80,
  });

  return { categories };
}

export async function getDiscoveryBooks(
  mood: DiscoveryMood,
  length: DiscoveryLength,
  filters: {
    language?: DiscoveryLanguage;
    era?: DiscoveryEra;
    categoryId?: string;
  } = {},
) {
  const keywords = moodKeywords[mood];
  const language = filters.language ?? "ALL";
  const era = filters.era ?? "ALL";
  const books = await prisma.book.findMany({
    where: {
      ...publicExperienceBookWhere(),
      pages: pageFilter(length),
      languageCode: languageFilter(language),
      publishYear: publishYearFilter(era),
      categoryId: filters.categoryId || undefined,
      OR: keywords.flatMap((keyword) => [
        { category: { name: { contains: keyword, mode: "insensitive" } } },
        { title: { contains: keyword, mode: "insensitive" } },
      ]),
    },
    orderBy: [{ rating: "desc" }, { title: "asc" }],
    take: 12,
    select: {
      id: true,
      title: true,
      authorName: true,
      coverPath: true,
      pages: true,
      publishYear: true,
      languageCode: true,
      rating: true,
      category: { select: { name: true } },
    },
  });

  return books.map((book) => ({
    id: book.id,
    title: getVietnameseBookTitle(book.id, book.title),
    author: book.authorName,
    coverImage: normalizeBookCoverUrl(book.coverPath),
    pages: book.pages,
    publishYear: book.publishYear,
    languageCode: book.languageCode,
    rating: book.rating ? Number(book.rating) : null,
    category: book.category.name,
  }));
}
