"use server";

import { Prisma } from "@prisma/client";

import { normalizeBookCoverUrl } from "@/lib/book-cover";
import prisma from "@/lib/prisma";

type DecimalLike = { toNumber: () => number };

export type CatalogSourceFilter = "all" | "real" | "demo";

export interface CatalogCategory {
  id: string;
  name: string;
  slug: string;
}

export interface CatalogBook {
  id: string;
  title: string;
  author: string;
  description: string | null;
  coverImage: string | null;
  price: number;
  rating: number | null;
  sourceRating: number | null;
  catalogSource: "CURATED_REAL" | "SYNTHETIC_DEMO";
  metadataBadge: "Metadata tuyển chọn" | "Dữ liệu demo";
  priceLabel: "Giá demo" | null;
  category: CatalogCategory;
}

export interface CatalogFilters {
  query?: string;
  categoryId?: string;
  source?: CatalogSourceFilter;
  language?: string;
  publishYear?: number;
  hasIsbn?: boolean;
  hasSourceRating?: boolean;
  page?: number;
}

export interface CatalogData {
  books: CatalogBook[];
  categories: CatalogCategory[];
  totalBooks: number;
  visibleBooks: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

const PAGE_SIZE = 24;

function decimalToNumber(value: DecimalLike | number | string | null): number | null {
  if (value === null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value.toNumber();
}

function buildMetadataFilter(filters: CatalogFilters): Prisma.BookSourceMetadataWhereInput {
  return {
    ...(filters.language === "NOT_AVAILABLE"
      ? { languageProfile: "NOT_AVAILABLE" }
      : filters.language
        ? { languages: { has: filters.language } }
        : {}),
    ...(filters.hasIsbn ? { isbn: { not: null } } : {}),
    ...(filters.hasSourceRating ? { sourceRatingAverage: { not: null } } : {}),
  };
}

export async function getCatalogData(filters: CatalogFilters = {}): Promise<CatalogData> {
  try {
    const query = filters.query?.trim();
    const categoryId = filters.categoryId?.trim();
    const source = filters.source ?? "all";
    const page = Math.max(1, Math.floor(filters.page ?? 1));
    const metadataFilter = buildMetadataFilter(filters);
    const hasMetadataFilter = Object.keys(metadataFilter).length > 0;
    const sourceWhere: Prisma.BookWhereInput =
      source === "real"
        ? { sourceMetadata: { is: metadataFilter } }
        : source === "demo"
          ? { sourceMetadata: { is: null } }
          : hasMetadataFilter
            ? { sourceMetadata: { is: metadataFilter } }
            : {};
    const where: Prisma.BookWhereInput = {
      ...sourceWhere,
      ...(categoryId ? { categoryId } : {}),
      ...(filters.publishYear ? { publishYear: filters.publishYear } : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { authorName: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              {
                sourceMetadata: {
                  is: {
                    OR: [
                      { publisher: { contains: query, mode: "insensitive" } },
                      { isbn: { contains: query, mode: "insensitive" } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [categories, totalBooks, books] = await Promise.all([
      prisma.category.findMany({
        where: { parentId: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      }),
      prisma.book.count({ where }),
      prisma.book.findMany({
        where,
        orderBy: [{ title: "asc" }, { id: "asc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          sourceMetadata: {
            select: {
              dataLabel: true,
              priceStatus: true,
              sourceRatingAverage: true,
            },
          },
        },
      }),
    ]);
    const totalPages = Math.max(1, Math.ceil(totalBooks / PAGE_SIZE));

    return {
      categories,
      totalBooks,
      visibleBooks: books.length,
      page,
      pageSize: PAGE_SIZE,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
      books: books.map((book) => {
        const isCurated = Boolean(book.sourceMetadata);
        return {
          id: book.id,
          title: book.title,
          author: book.authorName,
          description: book.description,
          coverImage: normalizeBookCoverUrl(book.coverPath),
          price: decimalToNumber(book.price) ?? 0,
          rating: decimalToNumber(book.rating),
          sourceRating: book.sourceMetadata?.sourceRatingAverage ?? null,
          catalogSource: isCurated ? "CURATED_REAL" : "SYNTHETIC_DEMO",
          metadataBadge: isCurated ? "Metadata tuyển chọn" : "Dữ liệu demo",
          priceLabel: isCurated ? "Giá demo" : null,
          category: book.category,
        };
      }),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[getCatalogData] ${message}`);
    return {
      books: [],
      categories: [],
      totalBooks: 0,
      visibleBooks: 0,
      page: 1,
      pageSize: PAGE_SIZE,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    };
  }
}
