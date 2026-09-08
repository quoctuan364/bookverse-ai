import { createHash } from "node:crypto";

import type {
  RealCatalog,
  RealCatalogBook,
  RealCatalogCategoryMapping,
  SourceIdentity,
} from "@/lib/real-catalog";

export interface TargetCategory {
  id: string;
  name: string;
  slug: string;
  canonicalKey: string | null;
  canonicalName: string | null;
  parentId: string | null;
}

export interface ResolvedCategoryMappingRow {
  sourceId: string;
  sourceSlug: string;
  sourceName: string;
  targetCategoryId: string;
  targetCategorySlug: string;
  targetCategoryName: string;
  targetCanonicalKey: string;
  targetCanonicalName: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  rationale: string;
  ambiguity: string;
  resolutionMode: "PRIMARY" | "FALLBACK";
}

export interface ImportProjection {
  book: {
    id: string;
    title: string;
    slug: string;
    authorName: string;
    description: string | null;
    level: string | null;
    format: "PAPER";
    price: number;
    rating: null;
    pages: number | null;
    publishYear: number | null;
    isEbook: false;
    status: "ACTIVE";
    deletedAt: null;
    coverPath: string;
    categoryId: string;
  };
  metadata: {
    sourceProvider: "OPEN_LIBRARY";
    sourceRecordKey: string;
    sourceRecordType: SourceIdentity["sourceRecordType"];
    sourceWorkKey: string | null;
    sourceWorkKeyRaw: string;
    sourceEditionKey: string | null;
    sourcePageUrl: string;
    dataLabel: string;
    metadataQuality: string;
    coverId: string;
    coverRightsStatus: string;
    priceStatus: string;
    languageProfile: string;
    languages: string[];
    isbn: string | null;
    publisher: string | null;
    sourceFormat: string;
    descriptionStatus: string;
    sourceRatingStatus: string;
    sourceRatingAverage: number | null;
    sourceRatingCount: number | null;
    primarySourceCategoryId: string;
    primarySourceCategoryName: string;
    sourceCategoryIds: string[];
    isVietnameseEdition: boolean;
    authorNationality: string;
  };
}

function normalizedTargetSlug(value: string): string {
  return value.replace(/-\d+$/u, "");
}

export function resolveCategoryTargets(
  mapping: RealCatalogCategoryMapping,
  categories: readonly TargetCategory[],
): { rows: ResolvedCategoryMappingRow[]; errors: string[] } {
  const rows: ResolvedCategoryMappingRow[] = [];
  const errors: string[] = [];
  for (const entry of mapping.entries) {
    const targets = [
      {
        targetCanonicalKey: entry.targetCanonicalKey,
        targetCanonicalName: entry.targetCanonicalName,
        preferredTargetSlugs: entry.preferredTargetSlugs,
        confidence: entry.confidence,
        rationale: entry.rationale,
        resolutionMode: "PRIMARY" as const,
      },
      ...(entry.fallbackTarget
        ? [{ ...entry.fallbackTarget, resolutionMode: "FALLBACK" as const }]
        : []),
    ];
    let resolved:
      | { target: TargetCategory; specification: (typeof targets)[number] }
      | null = null;
    for (const specification of targets) {
      const candidates = categories
        .filter(
          (category) =>
            category.parentId === null &&
            category.canonicalKey === specification.targetCanonicalKey,
        )
        .sort((left, right) => left.id.localeCompare(right.id));
      if (candidates.length === 0) continue;
      const preferred = specification.preferredTargetSlugs
        .map((slug) => candidates.find((category) => normalizedTargetSlug(category.slug) === slug))
        .find((category): category is TargetCategory => Boolean(category));
      const target = preferred ?? (candidates.length === 1 ? candidates[0] : null);
      if (!target) {
        errors.push(
          `${entry.sourceId}/${entry.sourceSlug}: canonicalKey=${specification.targetCanonicalKey} có ${candidates.length} target nhưng không có preferred slug hợp lệ.`,
        );
        break;
      }
      if (target.canonicalName !== specification.targetCanonicalName) {
        errors.push(
          `${entry.sourceId}/${entry.sourceSlug}: canonicalName target=${target.canonicalName ?? "null"} không khớp ${specification.targetCanonicalName}.`,
        );
        break;
      }
      resolved = { target, specification };
      break;
    }
    const target = resolved?.target ?? null;
    if (!target) {
      if (!errors.some((error) => error.startsWith(`${entry.sourceId}/${entry.sourceSlug}:`))) {
        errors.push(
          `${entry.sourceId}/${entry.sourceSlug}: không resolve primary=${entry.targetCanonicalKey} hoặc fallback=${entry.fallbackTarget?.targetCanonicalKey ?? "NOT_AVAILABLE"}.`,
        );
      }
      continue;
    }
    const specification = resolved!.specification;
    rows.push({
      sourceId: entry.sourceId,
      sourceSlug: entry.sourceSlug,
      sourceName: entry.sourceName,
      targetCategoryId: target.id,
      targetCategorySlug: target.slug,
      targetCategoryName: target.name,
      targetCanonicalKey: specification.targetCanonicalKey,
      targetCanonicalName: specification.targetCanonicalName,
      confidence: specification.confidence,
      rationale: specification.rationale,
      ambiguity: entry.ambiguity,
      resolutionMode: specification.resolutionMode,
    });
  }
  return { rows, errors };
}

function buildAuthorNames(catalog: RealCatalog): Map<string, string> {
  const authorById = new Map(catalog.authors.map((author) => [author.id, author.name]));
  const relationsByBook = new Map<string, Array<{ authorId: string; position: number }>>();
  for (const relation of catalog.bookAuthors) {
    const current = relationsByBook.get(relation.bookId) ?? [];
    current.push({ authorId: relation.authorId, position: Number.parseInt(relation.position, 10) || 0 });
    relationsByBook.set(relation.bookId, current);
  }
  return new Map(
    catalog.books.map((book) => {
      const names = (relationsByBook.get(book.id) ?? [])
        .sort((left, right) => left.position - right.position || left.authorId.localeCompare(right.authorId))
        .map((relation) => authorById.get(relation.authorId))
        .filter((name): name is string => Boolean(name));
      return [book.id, names.join(", ")];
    }),
  );
}

function buildSourceCategoryIds(catalog: RealCatalog): Map<string, string[]> {
  const idsByBook = new Map<string, string[]>();
  for (const relation of catalog.bookCategories) {
    const current = idsByBook.get(relation.bookId) ?? [];
    current.push(relation.categoryId);
    idsByBook.set(relation.bookId, current);
  }
  for (const [bookId, ids] of idsByBook) idsByBook.set(bookId, [...new Set(ids)].sort());
  return idsByBook;
}

export function buildImportProjections(
  catalog: RealCatalog,
  identities: ReadonlyMap<string, SourceIdentity>,
  categoryMapping: readonly ResolvedCategoryMappingRow[],
): { projections: ImportProjection[]; errors: string[] } {
  const errors: string[] = [];
  const projections: ImportProjection[] = [];
  const targetBySourceId = new Map(categoryMapping.map((row) => [row.sourceId, row.targetCategoryId]));
  const authorNames = buildAuthorNames(catalog);
  const sourceCategoryIds = buildSourceCategoryIds(catalog);

  for (const book of catalog.books) {
    const identity = identities.get(book.id);
    const categoryId = targetBySourceId.get(book.primaryCategoryId);
    const authorName = authorNames.get(book.id)?.trim();
    if (!identity) errors.push(`${book.id}: thiếu source identity.`);
    if (!categoryId) errors.push(`${book.id}: category ${book.primaryCategoryId} chưa map.`);
    if (!authorName) errors.push(`${book.id}: thiếu author đã resolve.`);
    if (!identity || !categoryId || !authorName) continue;
    projections.push(buildImportProjection(book, identity, categoryId, authorName, sourceCategoryIds.get(book.id) ?? []));
  }
  return { projections, errors };
}

function buildImportProjection(
  book: RealCatalogBook,
  identity: SourceIdentity,
  categoryId: string,
  authorName: string,
  sourceCategoryIds: string[],
): ImportProjection {
  const languageProfile =
    book.languages.length === 0
      ? "NOT_AVAILABLE"
      : book.isVietnameseEdition
        ? "VIETNAMESE_EDITION"
        : [...book.languages].sort().join(",");
  const sourcePageUrl = book.openLibraryEditionUrl ??
    (identity.sourceRecordType === "WORK"
      ? book.openLibraryWorkUrl
      : `https://openlibrary.org${identity.sourceRecordKey}`);
  return {
    book: {
      id: book.id,
      title: book.title,
      slug: book.slug,
      authorName,
      description: book.description,
      level: null,
      format: "PAPER",
      price: book.price,
      rating: null,
      pages: book.pageCount,
      publishYear: book.publishedYear,
      isEbook: false,
      status: "ACTIVE",
      deletedAt: null,
      coverPath: book.coverUrl,
      categoryId,
    },
    metadata: {
      sourceProvider: "OPEN_LIBRARY",
      sourceRecordKey: identity.sourceRecordKey,
      sourceRecordType: identity.sourceRecordType,
      sourceWorkKey: identity.sourceWorkKey,
      sourceWorkKeyRaw: identity.sourceWorkKeyRaw,
      sourceEditionKey: identity.sourceEditionKey,
      sourcePageUrl,
      dataLabel: book.dataLabel,
      metadataQuality: book.metadataQuality,
      coverId: String(book.coverId),
      coverRightsStatus: book.coverRightsStatus,
      priceStatus: book.priceStatus,
      languageProfile,
      languages: [...book.languages].sort(),
      isbn: book.isbn,
      publisher: book.publisher,
      sourceFormat: book.format,
      descriptionStatus: book.descriptionStatus,
      sourceRatingStatus: book.ratingStatus,
      sourceRatingAverage: book.ratingAverage,
      sourceRatingCount: book.ratingCount,
      primarySourceCategoryId: book.primaryCategoryId,
      primarySourceCategoryName: book.primaryCategoryName,
      sourceCategoryIds,
      isVietnameseEdition: book.isVietnameseEdition,
      authorNationality: book.authorNationality,
    },
  };
}

export function projectionChecksum(projection: ImportProjection): string {
  return createHash("sha256").update(JSON.stringify(projection)).digest("hex");
}
