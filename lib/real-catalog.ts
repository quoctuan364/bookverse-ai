import { createHash } from "node:crypto";
import fs from "node:fs";
import { isAllowedCoverSourceUrl } from "@/lib/cover-policy";

export const REAL_CATALOG_DATA_LABEL = "CURATED_REAL_BIBLIOGRAPHIC_METADATA";
export const REAL_CATALOG_PRICE_STATUS = "SYNTHETIC_DEMO_PRICE";
export const REAL_CATALOG_RIGHTS_STATUS = "NOT_VERIFIED";
export const REAL_CATALOG_PROVIDER = "OPEN_LIBRARY";
export const EXPECTED_REAL_CATALOG_BOOKS = 3_046;
export const EXPECTED_REAL_CATALOG_WORKS = 3_044;
export const EXPECTED_REAL_CATALOG_EDITION_ONLY = 2;

export interface RealCatalogCategory {
  id: string;
  slug: string;
  name: string;
  query: string;
  dataLabel: string;
}

export interface RealCatalogAuthor {
  id: string;
  name: string;
  openLibraryAuthorKey: string | null;
  nationality: string;
  dataLabel: string;
}

export interface RealCatalogBook {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  isbn: string | null;
  isbnStatus: string;
  description: string | null;
  descriptionStatus: string;
  languages: string[];
  isVietnameseEdition: boolean;
  vietnameseAuthorQueryMatch: boolean;
  authorNationality: string;
  primaryCategoryId: string;
  primaryCategoryName: string;
  publisher: string | null;
  publishedYear: number | null;
  pageCount: number | null;
  format: string;
  price: number;
  priceCurrency: string;
  priceStatus: string;
  ratingAverage: number | null;
  ratingCount: number | null;
  ratingStatus: string;
  coverUrl: string;
  coverDetailUrl: string;
  coverId: number;
  coverStatus: string;
  coverRightsStatus: string;
  openLibraryWorkKey: string;
  openLibraryEditionKey: string | null;
  openLibraryWorkUrl: string;
  openLibraryEditionUrl: string | null;
  editionCount: number;
  subjects: string[];
  dataLabel: string;
  sourceQueries: string[];
  metadataQuality: string;
}

export interface RealCatalog {
  meta: Record<string, unknown>;
  categories: RealCatalogCategory[];
  authors: RealCatalogAuthor[];
  books: RealCatalogBook[];
  bookAuthors: Array<{ bookId: string; authorId: string; position: string }>;
  bookCategories: Array<{ bookId: string; categoryId: string }>;
}

export interface SourceIdentity {
  sourceRecordKey: string;
  sourceRecordType: "WORK" | "EDITION_ONLY";
  sourceWorkKey: string | null;
  sourceWorkKeyRaw: string;
  sourceEditionKey: string | null;
}

export interface CatalogValidationIssue {
  code: string;
  path: string;
  message: string;
  severity: "ERROR" | "WARNING";
}

export interface CatalogValidationSummary {
  status: "VERIFIED" | "PARTIAL" | "FAILED";
  catalogChecksum: string;
  books: number;
  authors: number;
  categories: number;
  uniqueBookIds: number;
  uniqueWorkRecords: number;
  editionOnlyRecords: number;
  uniqueSourceRecords: number;
  uniqueCoverIds: number;
  uniqueCoverUrls: number;
  uniqueIsbn: number;
  vietnameseEditions: number;
  missingLanguage: number;
  orphanBookAuthor: number;
  orphanBookCategory: number;
  booksWithoutAuthor: number;
  booksWithoutCategory: number;
  invalidCoverUrls: number;
  invalidSourceUrls: number;
  issues: CatalogValidationIssue[];
}

export interface RealCatalogValidationResult {
  catalog: RealCatalog | null;
  summary: CatalogValidationSummary;
}

export type CategoryMappingConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface CategoryMappingFallbackTarget {
  targetCanonicalKey: string;
  targetCanonicalName: string;
  preferredTargetSlugs: string[];
  confidence: CategoryMappingConfidence;
  rationale: string;
}

export interface CategoryMappingEntry {
  sourceId: string;
  sourceSlug: string;
  sourceName: string;
  targetCanonicalKey: string;
  targetCanonicalName: string;
  preferredTargetSlugs: string[];
  confidence: CategoryMappingConfidence;
  rationale: string;
  ambiguity: string;
  fallbackTarget?: CategoryMappingFallbackTarget;
}

export interface RealCatalogCategoryMapping {
  schemaVersion: number;
  sourceCatalogChecksum: string;
  sourceCategoryChecksum: string;
  mappingPolicy: string;
  entries: CategoryMappingEntry[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function addIssue(
  issues: CatalogValidationIssue[],
  severity: CatalogValidationIssue["severity"],
  code: string,
  path: string,
  message: string,
): void {
  issues.push({ code, path, message, severity });
}

function uniqueCount(values: readonly (string | number)[]): number {
  return new Set(values.map(String)).size;
}

export function sha256Buffer(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function computeSourceCategoryChecksum(categories: readonly RealCatalogCategory[]): string {
  const normalized = [...categories]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(({ id, slug, name, query }) => ({ id, slug, name, query }));
  return sha256Buffer(JSON.stringify(normalized));
}

export function validateOpenLibraryCoverUrl(value: string): boolean {
  return isAllowedCoverSourceUrl(value);
}

export function validateOpenLibraryPageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "openlibrary.org" &&
      url.username === "" &&
      url.password === "" &&
      (/^\/works\/OL\d+W$/u.test(url.pathname) || /^\/books\/OL\d+M$/u.test(url.pathname))
    );
  } catch {
    return false;
  }
}

export function resolveSourceIdentity(book: Pick<RealCatalogBook, "openLibraryWorkKey" | "openLibraryEditionKey">): SourceIdentity | null {
  if (/^\/works\/OL\d+W$/u.test(book.openLibraryWorkKey)) {
    return {
      sourceRecordKey: book.openLibraryWorkKey,
      sourceRecordType: "WORK",
      sourceWorkKey: book.openLibraryWorkKey,
      sourceWorkKeyRaw: book.openLibraryWorkKey,
      sourceEditionKey: book.openLibraryEditionKey,
    };
  }

  const rawOlid = book.openLibraryWorkKey.match(/^\/works\/(OL\d+M)$/u)?.[1];
  const editionOlid = book.openLibraryEditionKey?.match(/^\/books\/(OL\d+M)$/u)?.[1];
  if (rawOlid && rawOlid === editionOlid) {
    return {
      sourceRecordKey: `/books/${editionOlid}`,
      sourceRecordType: "EDITION_ONLY",
      sourceWorkKey: null,
      sourceWorkKeyRaw: book.openLibraryWorkKey,
      sourceEditionKey: book.openLibraryEditionKey,
    };
  }
  return null;
}

function hasRequiredCatalogShape(value: unknown): value is RealCatalog {
  if (!isRecord(value) || !isRecord(value.meta)) return false;
  return ["categories", "authors", "books", "bookAuthors", "bookCategories"].every((key) =>
    Array.isArray(value[key]),
  );
}

export function validateRealCatalog(value: unknown, sourceBytes: Buffer): RealCatalogValidationResult {
  const issues: CatalogValidationIssue[] = [];
  const emptySummary: CatalogValidationSummary = {
    status: "FAILED",
    catalogChecksum: sha256Buffer(sourceBytes),
    books: 0,
    authors: 0,
    categories: 0,
    uniqueBookIds: 0,
    uniqueWorkRecords: 0,
    editionOnlyRecords: 0,
    uniqueSourceRecords: 0,
    uniqueCoverIds: 0,
    uniqueCoverUrls: 0,
    uniqueIsbn: 0,
    vietnameseEditions: 0,
    missingLanguage: 0,
    orphanBookAuthor: 0,
    orphanBookCategory: 0,
    booksWithoutAuthor: 0,
    booksWithoutCategory: 0,
    invalidCoverUrls: 0,
    invalidSourceUrls: 0,
    issues,
  };

  if (!hasRequiredCatalogShape(value)) {
    addIssue(issues, "ERROR", "INVALID_ROOT_SHAPE", "$", "Catalog thiếu meta hoặc các collection bắt buộc.");
    return { catalog: null, summary: emptySummary };
  }

  const catalog = value;
  const allowedTopLevel = new Set(["meta", "categories", "authors", "books", "bookAuthors", "bookCategories"]);
  for (const key of Object.keys(value)) {
    if (!allowedTopLevel.has(key)) {
      addIssue(issues, "ERROR", "UNEXPECTED_TOP_LEVEL_DATA", key, "Catalog có collection ngoài contract được duyệt.");
    }
  }

  const categoryIds = new Set<string>();
  for (const [index, category] of catalog.categories.entries()) {
    const path = `categories[${index}]`;
    if (!isRecord(category) || typeof category.id !== "string" || typeof category.slug !== "string" || typeof category.name !== "string") {
      addIssue(issues, "ERROR", "INVALID_CATEGORY", path, "Category thiếu id/slug/name dạng chuỗi.");
      continue;
    }
    categoryIds.add(category.id);
  }

  const authorIds = new Set<string>();
  for (const [index, author] of catalog.authors.entries()) {
    const path = `authors[${index}]`;
    if (!isRecord(author) || typeof author.id !== "string" || typeof author.name !== "string") {
      addIssue(issues, "ERROR", "INVALID_AUTHOR", path, "Author thiếu id/name dạng chuỗi.");
      continue;
    }
    if (author.nationality !== "NOT_VERIFIED") {
      addIssue(issues, "ERROR", "WRONG_AUTHOR_NATIONALITY", `${path}.nationality`, "Không được suy đoán quốc tịch tác giả.");
    }
    authorIds.add(author.id);
  }

  const sourceIdentities: SourceIdentity[] = [];
  let invalidCoverUrls = 0;
  let invalidSourceUrls = 0;
  let missingLanguage = 0;
  for (const [index, book] of catalog.books.entries()) {
    const path = `books[${index}]`;
    if (!isRecord(book)) {
      addIssue(issues, "ERROR", "INVALID_BOOK", path, "Book phải là object.");
      continue;
    }
    const requiredStrings = ["id", "title", "slug", "isbnStatus", "descriptionStatus", "primaryCategoryId", "primaryCategoryName", "priceStatus", "ratingStatus", "coverUrl", "coverRightsStatus", "openLibraryWorkKey", "openLibraryWorkUrl", "dataLabel", "metadataQuality"];
    for (const field of requiredStrings) {
      if (typeof book[field] !== "string" || String(book[field]).trim() === "") {
        addIssue(issues, "ERROR", "INVALID_BOOK_FIELD", `${path}.${field}`, `${field} phải là chuỗi không rỗng.`);
      }
    }
    if (!/^RB\d{5}$/u.test(String(book.id))) {
      addIssue(issues, "ERROR", "INVALID_BOOK_ID", `${path}.id`, "Book ID phải nằm trong namespace RBxxxxx.");
    }
    if (!isStringArray(book.languages)) {
      addIssue(issues, "ERROR", "INVALID_LANGUAGES", `${path}.languages`, "languages phải là mảng chuỗi.");
    } else if (book.languages.length === 0) {
      missingLanguage += 1;
      addIssue(issues, "WARNING", "LANGUAGE_NOT_AVAILABLE", `${path}.languages`, "Nguồn không có language; importer phải giữ NOT_AVAILABLE.");
    }
    if (!isStringArray(book.subjects) || !isStringArray(book.sourceQueries)) {
      addIssue(issues, "ERROR", "INVALID_STRING_ARRAY", path, "subjects/sourceQueries phải là mảng chuỗi.");
    }
    if (typeof book.price !== "number" || !Number.isFinite(book.price) || book.price < 0) {
      addIssue(issues, "ERROR", "INVALID_PRICE", `${path}.price`, "Giá demo phải là số không âm.");
    }
    if (book.priceStatus !== REAL_CATALOG_PRICE_STATUS) {
      addIssue(issues, "ERROR", "WRONG_PRICE_STATUS", `${path}.priceStatus`, "Giá phải gắn SYNTHETIC_DEMO_PRICE.");
    }
    if (book.coverRightsStatus !== REAL_CATALOG_RIGHTS_STATUS) {
      addIssue(issues, "ERROR", "WRONG_COVER_RIGHTS", `${path}.coverRightsStatus`, "Cover rights phải giữ NOT_VERIFIED.");
    }
    if (book.dataLabel !== REAL_CATALOG_DATA_LABEL) {
      addIssue(issues, "ERROR", "WRONG_DATA_LABEL", `${path}.dataLabel`, "Book phải gắn nhãn bibliographic metadata.");
    }
    if (book.authorNationality !== "NOT_VERIFIED") {
      addIssue(issues, "ERROR", "WRONG_AUTHOR_NATIONALITY", `${path}.authorNationality`, "Không được suy đoán quốc tịch.");
    }
    if (!validateOpenLibraryCoverUrl(String(book.coverUrl))) {
      invalidCoverUrls += 1;
      addIssue(issues, "ERROR", "INVALID_COVER_URL", `${path}.coverUrl`, "Cover URL ngoài allowlist hoặc malformed.");
    }
    if (!validateOpenLibraryPageUrl(String(book.openLibraryWorkUrl))) {
      invalidSourceUrls += 1;
      const identity = resolveSourceIdentity(book as unknown as RealCatalogBook);
      if (identity?.sourceRecordType !== "EDITION_ONLY") {
        addIssue(issues, "ERROR", "INVALID_WORK_URL", `${path}.openLibraryWorkUrl`, "Work URL không hợp lệ.");
      }
    }
    if (book.openLibraryEditionUrl !== null && (typeof book.openLibraryEditionUrl !== "string" || !validateOpenLibraryPageUrl(book.openLibraryEditionUrl))) {
      invalidSourceUrls += 1;
      addIssue(issues, "ERROR", "INVALID_EDITION_URL", `${path}.openLibraryEditionUrl`, "Edition URL không hợp lệ.");
    }
    const identity = resolveSourceIdentity(book as unknown as RealCatalogBook);
    if (!identity) {
      addIssue(issues, "ERROR", "INVALID_SOURCE_IDENTITY", `${path}.openLibraryWorkKey`, "Không xác định được work hoặc edition-only identity.");
    } else {
      sourceIdentities.push(identity);
      if (identity.sourceRecordType === "EDITION_ONLY") {
        addIssue(issues, "WARNING", "EDITION_ONLY_SOURCE", `${path}.openLibraryWorkKey`, "Open Library trả OLID edition ở work field; không được gọi là work key.");
      }
    }
  }

  const bookIds = new Set(catalog.books.map((book) => book.id));
  let orphanBookAuthor = 0;
  let orphanBookCategory = 0;
  const booksWithAuthor = new Set<string>();
  const booksWithCategory = new Set<string>();
  for (const relation of catalog.bookAuthors) {
    if (!isRecord(relation) || typeof relation.bookId !== "string" || typeof relation.authorId !== "string") {
      orphanBookAuthor += 1;
      continue;
    }
    if (!bookIds.has(relation.bookId) || !authorIds.has(relation.authorId)) orphanBookAuthor += 1;
    else booksWithAuthor.add(relation.bookId);
  }
  for (const relation of catalog.bookCategories) {
    if (!isRecord(relation) || typeof relation.bookId !== "string" || typeof relation.categoryId !== "string") {
      orphanBookCategory += 1;
      continue;
    }
    if (!bookIds.has(relation.bookId) || !categoryIds.has(relation.categoryId)) orphanBookCategory += 1;
    else booksWithCategory.add(relation.bookId);
  }

  if (catalog.books.length !== EXPECTED_REAL_CATALOG_BOOKS) addIssue(issues, "ERROR", "WRONG_BOOK_COUNT", "books", "Catalog phải có 3.046 Book.");
  if (catalog.authors.length !== 3_260) addIssue(issues, "ERROR", "WRONG_AUTHOR_COUNT", "authors", "Catalog phải có 3.260 Author.");
  if (catalog.categories.length !== 39) addIssue(issues, "ERROR", "WRONG_CATEGORY_COUNT", "categories", "Catalog phải có 39 category.");
  if (orphanBookAuthor > 0) addIssue(issues, "ERROR", "ORPHAN_BOOK_AUTHOR", "bookAuthors", `${orphanBookAuthor} relation orphan.`);
  if (orphanBookCategory > 0) addIssue(issues, "ERROR", "ORPHAN_BOOK_CATEGORY", "bookCategories", `${orphanBookCategory} relation orphan.`);

  const duplicateChecks: Array<[string, number, number]> = [
    ["Book ID", catalog.books.length, uniqueCount(catalog.books.map((book) => book.id))],
    ["source record", sourceIdentities.length, uniqueCount(sourceIdentities.map((identity) => identity.sourceRecordKey))],
    ["cover ID", catalog.books.length, uniqueCount(catalog.books.map((book) => book.coverId))],
    ["cover URL", catalog.books.length, uniqueCount(catalog.books.map((book) => book.coverUrl))],
  ];
  for (const [label, total, unique] of duplicateChecks) {
    if (total !== unique) addIssue(issues, "ERROR", "DUPLICATE_INVARIANT", label, `${label}: ${total - unique} duplicate.`);
  }
  const workRecords = sourceIdentities.filter((identity) => identity.sourceRecordType === "WORK");
  const editionOnlyRecords = sourceIdentities.filter((identity) => identity.sourceRecordType === "EDITION_ONLY");
  if (workRecords.length !== EXPECTED_REAL_CATALOG_WORKS) {
    addIssue(
      issues,
      "ERROR",
      "WORK_COUNT_INVARIANT_FAILED",
      "books.openLibraryWorkKey",
      `Catalog phải giữ đúng ${EXPECTED_REAL_CATALOG_WORKS} WORK; nhận ${workRecords.length}.`,
    );
  }
  if (editionOnlyRecords.length !== EXPECTED_REAL_CATALOG_EDITION_ONLY) {
    addIssue(
      issues,
      "ERROR",
      "EDITION_ONLY_COUNT_INVARIANT_FAILED",
      "books.openLibraryWorkKey",
      `Catalog phải giữ đúng ${EXPECTED_REAL_CATALOG_EDITION_ONLY} EDITION_ONLY; nhận ${editionOnlyRecords.length}.`,
    );
  }
  if (
    sourceIdentities.some(
      (identity) =>
        !identity.sourceWorkKeyRaw ||
        (identity.sourceRecordType === "WORK" && identity.sourceWorkKeyRaw !== identity.sourceWorkKey) ||
        (identity.sourceRecordType === "EDITION_ONLY" && identity.sourceWorkKey !== null),
    )
  ) {
    addIssue(
      issues,
      "ERROR",
      "SOURCE_RAW_KEY_INVARIANT_FAILED",
      "books.openLibraryWorkKey",
      "Raw source key phải được giữ và EDITION_ONLY không được có sourceWorkKey.",
    );
  }
  const isbnValues = catalog.books.flatMap((book) => (book.isbn ? [book.isbn] : []));
  if (isbnValues.length !== uniqueCount(isbnValues) || isbnValues.length !== 2_343) {
    addIssue(issues, "ERROR", "ISBN_INVARIANT_FAILED", "books.isbn", "ISBN non-null phải duy nhất và có đúng 2.343 giá trị.");
  }

  const errorCount = issues.filter((issue) => issue.severity === "ERROR").length;
  const warningCount = issues.filter((issue) => issue.severity === "WARNING").length;
  const uniqueWorkRecords = workRecords.length;
  const editionOnlyRecordCount = editionOnlyRecords.length;
  const summary: CatalogValidationSummary = {
    status: errorCount > 0 ? "FAILED" : warningCount > 0 ? "PARTIAL" : "VERIFIED",
    catalogChecksum: sha256Buffer(sourceBytes),
    books: catalog.books.length,
    authors: catalog.authors.length,
    categories: catalog.categories.length,
    uniqueBookIds: uniqueCount(catalog.books.map((book) => book.id)),
    uniqueWorkRecords,
    editionOnlyRecords: editionOnlyRecordCount,
    uniqueSourceRecords: uniqueCount(sourceIdentities.map((identity) => identity.sourceRecordKey)),
    uniqueCoverIds: uniqueCount(catalog.books.map((book) => book.coverId)),
    uniqueCoverUrls: uniqueCount(catalog.books.map((book) => book.coverUrl)),
    uniqueIsbn: uniqueCount(isbnValues),
    vietnameseEditions: catalog.books.filter((book) => book.isVietnameseEdition).length,
    missingLanguage,
    orphanBookAuthor,
    orphanBookCategory,
    booksWithoutAuthor: catalog.books.filter((book) => !booksWithAuthor.has(book.id)).length,
    booksWithoutCategory: catalog.books.filter((book) => !booksWithCategory.has(book.id)).length,
    invalidCoverUrls,
    invalidSourceUrls,
    issues,
  };
  return { catalog: errorCount > 0 ? null : catalog, summary };
}

export function loadAndValidateRealCatalog(filePath: string): RealCatalogValidationResult {
  const sourceBytes = fs.readFileSync(filePath);
  let value: unknown;
  try {
    value = JSON.parse(sourceBytes.toString("utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown JSON parse error";
    const issue: CatalogValidationIssue = { code: "INVALID_JSON", path: "$", message, severity: "ERROR" };
    return {
      catalog: null,
      summary: {
        status: "FAILED",
        catalogChecksum: sha256Buffer(sourceBytes),
        books: 0,
        authors: 0,
        categories: 0,
        uniqueBookIds: 0,
        uniqueWorkRecords: 0,
        editionOnlyRecords: 0,
        uniqueSourceRecords: 0,
        uniqueCoverIds: 0,
        uniqueCoverUrls: 0,
        uniqueIsbn: 0,
        vietnameseEditions: 0,
        missingLanguage: 0,
        orphanBookAuthor: 0,
        orphanBookCategory: 0,
        booksWithoutAuthor: 0,
        booksWithoutCategory: 0,
        invalidCoverUrls: 0,
        invalidSourceUrls: 0,
        issues: [issue],
      },
    };
  }
  return validateRealCatalog(value, sourceBytes);
}

export function loadAndValidateCategoryMapping(
  filePath: string,
  catalog: RealCatalog,
  catalogChecksum: string,
): { mapping: RealCatalogCategoryMapping | null; issues: CatalogValidationIssue[]; mappingChecksum: string } {
  const bytes = fs.readFileSync(filePath);
  const issues: CatalogValidationIssue[] = [];
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    addIssue(issues, "ERROR", "INVALID_MAPPING_JSON", "$", error instanceof Error ? error.message : "Invalid JSON");
    return { mapping: null, issues, mappingChecksum: sha256Buffer(bytes) };
  }
  if (!isRecord(value) || !Array.isArray(value.entries)) {
    addIssue(issues, "ERROR", "INVALID_MAPPING_SHAPE", "$", "Mapping thiếu entries.");
    return { mapping: null, issues, mappingChecksum: sha256Buffer(bytes) };
  }
  const mapping = value as unknown as RealCatalogCategoryMapping;
  if (mapping.schemaVersion !== 2) {
    addIssue(issues, "ERROR", "MAPPING_SCHEMA_VERSION", "schemaVersion", "Mapping G2.1 phải dùng schemaVersion=2.");
  }
  if (mapping.sourceCatalogChecksum !== catalogChecksum) {
    addIssue(issues, "ERROR", "CATALOG_CHECKSUM_MISMATCH", "sourceCatalogChecksum", "Mapping không thuộc catalog hiện tại.");
  }
  const categoryChecksum = computeSourceCategoryChecksum(catalog.categories);
  if (mapping.sourceCategoryChecksum !== categoryChecksum) {
    addIssue(issues, "ERROR", "CATEGORY_CHECKSUM_MISMATCH", "sourceCategoryChecksum", "Source category đã thay đổi.");
  }
  const categoryById = new Map(catalog.categories.map((category) => [category.id, category]));
  if (mapping.entries.length !== catalog.categories.length) {
    addIssue(issues, "ERROR", "MAPPING_COUNT_MISMATCH", "entries", "Mapping phải xử lý đủ 39 category.");
  }
  if (uniqueCount(mapping.entries.map((entry) => entry.sourceId)) !== mapping.entries.length) {
    addIssue(issues, "ERROR", "DUPLICATE_MAPPING", "entries", "Source category mapping bị trùng.");
  }
  for (const [index, entry] of mapping.entries.entries()) {
    const source = categoryById.get(entry.sourceId);
    if (!source || source.slug !== entry.sourceSlug || source.name !== entry.sourceName) {
      addIssue(issues, "ERROR", "SOURCE_CATEGORY_MISMATCH", `entries[${index}]`, "ID/slug/name không khớp catalog.");
    }
    if (
      !entry.targetCanonicalKey?.trim() ||
      !entry.targetCanonicalName?.trim() ||
      !isStringArray(entry.preferredTargetSlugs) ||
      !(["HIGH", "MEDIUM", "LOW"] as const).includes(entry.confidence) ||
      !entry.rationale?.trim() ||
      typeof entry.ambiguity !== "string"
    ) {
      addIssue(issues, "ERROR", "INVALID_MAPPING_TARGET", `entries[${index}]`, "Target mapping không đầy đủ.");
    }
    if (
      entry.fallbackTarget &&
      (!entry.fallbackTarget.targetCanonicalKey?.trim() ||
        !entry.fallbackTarget.targetCanonicalName?.trim() ||
        !isStringArray(entry.fallbackTarget.preferredTargetSlugs) ||
        !(["HIGH", "MEDIUM", "LOW"] as const).includes(entry.fallbackTarget.confidence) ||
        !entry.fallbackTarget.rationale?.trim())
    ) {
      addIssue(issues, "ERROR", "INVALID_MAPPING_FALLBACK", `entries[${index}].fallbackTarget`, "Fallback mapping không đầy đủ.");
    }
  }
  return { mapping: issues.some((issue) => issue.severity === "ERROR") ? null : mapping, issues, mappingChecksum: sha256Buffer(bytes) };
}
