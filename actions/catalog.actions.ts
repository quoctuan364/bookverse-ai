"use server";

import prisma from "@/lib/prisma";

type DecimalLike = {
  toNumber: () => number;
};

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
  category: CatalogCategory;
}

export interface CatalogFilters {
  query?: string;
  categoryId?: string;
}

export interface CatalogData {
  books: CatalogBook[];
  categories: CatalogCategory[];
  totalBooks: number;
  visibleBooks: number;
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

function normalizeCoverPath(coverPath: string | null): string | null {
  if (!coverPath) {
    return null;
  }

  if (coverPath.startsWith("/") || coverPath.startsWith("http")) {
    return coverPath;
  }

  return `/${coverPath}`;
}

export async function getCatalogData(filters: CatalogFilters = {}): Promise<CatalogData> {
  try {
    const query = filters.query?.trim();
    const categoryId = filters.categoryId?.trim();

    const where = {
      ...(categoryId ? { categoryId } : {}),
      ...(query
        ? {
            OR: [
              {
                title: {
                  contains: query,
                  mode: "insensitive" as const,
                },
              },
              {
                authorName: {
                  contains: query,
                  mode: "insensitive" as const,
                },
              },
              {
                description: {
                  contains: query,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };

    const [categories, totalBooks, books] = await Promise.all([
      prisma.category.findMany({
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      }),
      prisma.book.count({
        where,
      }),
      prisma.book.findMany({
        where,
        orderBy: {
          title: "asc",
        },
        take: 60,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
    ]);

    return {
      categories,
      totalBooks,
      visibleBooks: books.length,
      books: books.map((book) => ({
        id: book.id,
        title: book.title,
        author: book.authorName,
        description: book.description,
        coverImage: normalizeCoverPath(book.coverPath),
        price: decimalToNumber(book.price) ?? 0,
        rating: decimalToNumber(book.rating),
        category: book.category,
      })),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[getCatalogData] ${message}`);
    return {
      books: [],
      categories: [],
      totalBooks: 0,
      visibleBooks: 0,
    };
  }
}
