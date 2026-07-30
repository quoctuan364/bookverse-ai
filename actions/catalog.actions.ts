"use server";

import { Prisma } from "@prisma/client";

import { normalizeBookCoverUrl } from "@/lib/book-cover";
import { normalizeCatalogLanguageFilter } from "@/lib/book-language";
import {
  rankCatalogSearchCandidates,
  sortRankedCatalogSearch,
  type CatalogSearchSort,
} from "@/lib/catalog-search";
import { getCurrentUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import {
  catalogBookQualityWhere,
  publicBookQualityWhere,
  publicDemoBookWhere,
} from "@/lib/public-book-policy";

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
  metadataBadge: "Sách tuyển chọn" | "Sách đề xuất";
  priceLabel: "Giá BookVerse" | null;
  category: CatalogCategory;
  availableListingId: string | null;
  isFavorite: boolean;
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
  sort?: CatalogSearchSort;
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
const CATALOG_BOOK_INCLUDE = {
  category: { select: { id: true, name: true, slug: true, canonicalName: true } },
  sourceMetadata: {
    select: {
      dataLabel: true,
      priceStatus: true,
      sourceRatingAverage: true,
    },
  },
  listings: {
    where: {
      status: "APPROVED",
      stock: { gt: 0 },
    },
    orderBy: { price: "asc" },
    take: 1,
    select: { id: true },
  },
} satisfies Prisma.BookInclude;

function decimalToNumber(value: DecimalLike | number | string | null): number | null {
  if (value === null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value.toNumber();
}

function buildMetadataFilter(filters: CatalogFilters): Prisma.BookSourceMetadataWhereInput {
  return {
    ...(filters.hasIsbn ? { isbn: { not: null } } : {}),
    ...(filters.hasSourceRating ? { sourceRatingAverage: { not: null } } : {}),
  };
}

function normalizeCatalogSort(value?: string): CatalogSearchSort {
  return value === "title" ||
    value === "rating" ||
    value === "price-low" ||
    value === "price-high" ||
    value === "newest"
    ? value
    : "relevance";
}

function catalogOrderBy(sort: CatalogSearchSort): Prisma.BookOrderByWithRelationInput[] {
  switch (sort) {
    case "rating":
      return [{ rating: "desc" }, { title: "asc" }, { id: "asc" }];
    case "price-low":
      return [{ price: "asc" }, { title: "asc" }, { id: "asc" }];
    case "price-high":
      return [{ price: "desc" }, { title: "asc" }, { id: "asc" }];
    case "newest":
      return [{ publishYear: "desc" }, { title: "asc" }, { id: "asc" }];
    default:
      return [{ title: "asc" }, { id: "asc" }];
  }
}

export async function getCatalogData(filters: CatalogFilters = {}): Promise<CatalogData> {
  try {
    const currentUser = await getCurrentUser();
    const userId = currentUser && !currentUser.isLocked ? currentUser.id : null;
    const query = filters.query?.trim();
    const categoryId = filters.categoryId?.trim();
    const source = filters.source ?? "all";
    const languageCode = normalizeCatalogLanguageFilter(filters.language);
    const page = Math.max(1, Math.floor(filters.page ?? 1));
    const sort = normalizeCatalogSort(filters.sort);
    const metadataFilter = buildMetadataFilter(filters);
    const publicRealWhere = publicBookQualityWhere();
    const hasPublicRealCatalog =
      (await prisma.book.count({ where: publicRealWhere, take: 1 })) > 0;
    const useDemoCatalog = source === "demo" || !hasPublicRealCatalog;
    const publicWhere = useDemoCatalog
      ? publicDemoBookWhere()
      : catalogBookQualityWhere(true);
    const needsMetadataFilter = Boolean(filters.hasIsbn || filters.hasSourceRating);
    const where: Prisma.BookWhereInput = {
      ...publicWhere,
      ...(filters.language === "NOT_AVAILABLE"
        ? { languageCode: null }
        : languageCode
          ? { languageCode }
          : {}),
      ...(!useDemoCatalog || needsMetadataFilter
        ? { sourceMetadata: { is: metadataFilter } }
        : {}),
      ...(categoryId ? { category: { canonicalKey: categoryId } } : {}),
      ...(filters.publishYear ? { publishYear: filters.publishYear } : {}),
    };

    const [categoryRows, rankedSearch] = await Promise.all([
      prisma.category.findMany({
        where: {
          parentId: null,
          canonicalKey: { not: null },
          books: { some: publicWhere },
        },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          canonicalKey: true,
          canonicalName: true,
        },
      }),
      query
        ? prisma.book
            .findMany({
              where,
              select: {
                id: true,
                title: true,
                authorName: true,
                description: true,
                price: true,
                rating: true,
                publishYear: true,
                category: { select: { name: true, canonicalName: true } },
                sourceMetadata: {
                  select: {
                    publisher: true,
                    isbn: true,
                  },
                },
              },
            })
            .then((books) => {
              const candidates = books.map((book) => ({
                  id: book.id,
                  title: book.title,
                  authorName: book.authorName,
                  description: book.description,
                  categoryName: book.category.canonicalName ?? book.category.name,
                  publisher: book.sourceMetadata?.publisher,
                  isbn: book.sourceMetadata?.isbn,
                  price: decimalToNumber(book.price),
                  rating: decimalToNumber(book.rating),
                  publishYear: book.publishYear,
                }));
              return sortRankedCatalogSearch(
                rankCatalogSearchCandidates(candidates, query),
                candidates,
                sort,
              );
            })
        : Promise.resolve(null),
    ]);
    const categories = [
      ...new Map(
        categoryRows.map((category) => [
          category.canonicalKey!,
          {
            id: category.canonicalKey!,
            name: category.canonicalName ?? category.name,
            slug: category.canonicalKey!,
          },
        ]),
      ).values(),
    ].sort((left, right) => left.name.localeCompare(right.name, "vi"));

    const totalBooks = rankedSearch?.length ?? (await prisma.book.count({ where }));
    const pageBookIds = rankedSearch
      ?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
      .map((item) => item.id);
    const books = await prisma.book.findMany({
      where: pageBookIds ? { ...where, id: { in: pageBookIds } } : where,
      orderBy: catalogOrderBy(sort),
      skip: pageBookIds ? undefined : (page - 1) * PAGE_SIZE,
      take: pageBookIds ? undefined : PAGE_SIZE,
      include: {
        ...CATALOG_BOOK_INCLUDE,
        favoriteBooks: {
          where: {
            userId: userId ?? "__BOOKVERSE_GUEST__",
          },
          take: 1,
          select: { id: true },
        },
      },
    });
    if (pageBookIds) {
      const positionById = new Map(pageBookIds.map((id, index) => [id, index]));
      books.sort(
        (left, right) =>
          (positionById.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
          (positionById.get(right.id) ?? Number.MAX_SAFE_INTEGER),
      );
    }
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
          // Mô tả nhập từ nguồn chỉ giữ để audit; giao diện công khai không sao chép nội dung đó.
          description: isCurated ? null : book.description,
          coverImage: normalizeBookCoverUrl(book.coverPath),
          price: decimalToNumber(book.price) ?? 0,
          rating: decimalToNumber(book.rating),
          sourceRating: book.sourceMetadata?.sourceRatingAverage ?? null,
          catalogSource: isCurated ? "CURATED_REAL" : "SYNTHETIC_DEMO",
          metadataBadge: isCurated ? "Sách tuyển chọn" : "Sách đề xuất",
          priceLabel: isCurated ? "Giá BookVerse" : null,
          category: {
            id: book.category.id,
            name: book.category.canonicalName ?? book.category.name,
            slug: book.category.slug,
          },
          availableListingId: book.listings[0]?.id ?? null,
          isFavorite: book.favoriteBooks.length > 0,
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
