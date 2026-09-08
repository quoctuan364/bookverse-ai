export type DatasetRecordStatus =
  | "VALID"
  | "VALID_WITH_WARNINGS"
  | "INVALID"
  | "SKIPPED_DUPLICATE"
  | "FAILED_RELATION";

export type DatasetIssueSeverity = "warning" | "error";

export interface DatasetIssue {
  recordIndex: number;
  bookId?: string;
  field: string;
  code: string;
  message: string;
  severity: DatasetIssueSeverity;
  receivedValue: unknown;
}

export interface ValidatedBookRecord {
  recordIndex: number;
  bookId?: string;
  status: DatasetRecordStatus;
  publishedYear: number | null;
  ratingAverage: number | null;
  issues: DatasetIssue[];
}

export interface DatasetValidationResult {
  records: ValidatedBookRecord[];
  issues: DatasetIssue[];
  total: number;
  valid: number;
  warnings: number;
  invalid: number;
  duplicates: number;
  failedRelations: number;
  topLevelErrors: string[];
}

export interface DatasetAnalysis {
  generatedAt: string;
  totalBooks: number;
  missingIds: number;
  duplicateIds: number;
  duplicateTitles: number;
  duplicateDescriptions: number;
  uniqueAuthors: number;
  uniqueCategories: number;
  uniqueTags: number;
  categoriesWithOneBook: number;
  authorsWithOneBook: number;
  missingFields: Record<string, number>;
  invalidFieldTypes: number;
  invalidRatings: number;
  invalidPublishedYears: number;
  invalidParentCategories: number;
  futureTimestamps: number;
  outOfOrderTimestamps: number;
  validation: Omit<DatasetValidationResult, "records" | "issues">;
}

type UnknownRecord = Record<string, unknown>;

const MAX_SAFE_TEXT_LENGTH = 120;
const MIN_PUBLISHED_YEAR = 1000;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function safeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.length > MAX_SAFE_TEXT_LENGTH
      ? value.slice(0, MAX_SAFE_TEXT_LENGTH) + "…"
      : value;
  }

  if (value === null || ["number", "boolean", "undefined"].includes(typeof value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return "[array length=" + value.length + "]";
  }

  return "[object]";
}

function issue(
  recordIndex: number,
  bookId: string | undefined,
  field: string,
  code: string,
  message: string,
  severity: DatasetIssueSeverity,
  receivedValue: unknown,
): DatasetIssue {
  return {
    recordIndex,
    bookId,
    field,
    code,
    message,
    severity,
    receivedValue: safeValue(receivedValue),
  };
}

function parseControlledNumber(value: unknown): { value: number | null; valid: boolean } {
  if (value === null || typeof value === "undefined" || value === "") {
    return { value: null, valid: true };
  }

  if (typeof value === "number") {
    return { value, valid: Number.isFinite(value) };
  }

  if (typeof value === "string" && /^[+-]?\d+(?:\.\d+)?$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return { value: parsed, valid: Number.isFinite(parsed) };
  }

  return { value: null, valid: false };
}

function resolveMappedNumber(
  record: UnknownRecord,
  primaryField: string,
  fallbackField: string,
): { value: number | null; sourceField: string; valid: boolean; received: unknown } {
  const primary = record[primaryField];
  const fallback = record[fallbackField];
  const received = primary ?? fallback ?? null;
  const parsed = parseControlledNumber(received);

  return {
    value: parsed.value,
    sourceField: primary !== null && typeof primary !== "undefined" ? primaryField : fallbackField,
    valid: parsed.valid,
    received,
  };
}

export function resolvePublishedYear(record: UnknownRecord): {
  value: number | null;
  sourceField: string;
  valid: boolean;
} {
  const mapped = resolveMappedNumber(record, "published_year", "publication_year");
  if (!mapped.valid || mapped.value === null) {
    return { value: mapped.value, sourceField: mapped.sourceField, valid: mapped.valid };
  }

  const maxYear = new Date().getUTCFullYear() + 1;
  const valid = Number.isInteger(mapped.value) && mapped.value >= MIN_PUBLISHED_YEAR && mapped.value <= maxYear;
  return { value: mapped.value, sourceField: mapped.sourceField, valid };
}

export function resolveRatingAverage(record: UnknownRecord): {
  value: number | null;
  sourceField: string;
  valid: boolean;
} {
  const mapped = resolveMappedNumber(record, "rating_avg", "rating_average");
  if (!mapped.valid || mapped.value === null) {
    return { value: mapped.value, sourceField: mapped.sourceField, valid: mapped.valid };
  }

  return {
    value: mapped.value,
    sourceField: mapped.sourceField,
    valid: mapped.value >= 0 && mapped.value <= 5,
  };
}

function numericId(value: unknown): number | null {
  const parsed = parseControlledNumber(value);
  return parsed.valid && parsed.value !== null && Number.isInteger(parsed.value) && parsed.value > 0
    ? parsed.value
    : null;
}

function stringId(value: unknown): string | undefined {
  const id = numericId(value);
  return id === null ? undefined : String(id);
}

function validDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function collectNumericIds(rows: unknown[]): Set<number> {
  return new Set(
    rows
      .map((item) => numericId(asRecord(item)?.id))
      .filter((value): value is number => value !== null),
  );
}

function relationMap(rows: unknown[], leftField: string, rightField: string): Map<number, number[]> {
  const result = new Map<number, number[]>();

  for (const row of rows) {
    const record = asRecord(row);
    const left = numericId(record?.[leftField]);
    const right = numericId(record?.[rightField]);
    if (left === null || right === null) {
      continue;
    }
    const values = result.get(left) ?? [];
    values.push(right);
    result.set(left, values);
  }

  return result;
}

function recordsByNumericField(rows: unknown[], field: string): Map<number, UnknownRecord[]> {
  const result = new Map<number, UnknownRecord[]>();
  for (const row of rows) {
    const record = asRecord(row);
    const key = numericId(record?.[field]);
    if (!record || key === null) {
      continue;
    }
    const values = result.get(key) ?? [];
    values.push(record);
    result.set(key, values);
  }
  return result;
}

function requiredStringIssues(
  record: UnknownRecord,
  recordIndex: number,
  bookId: string | undefined,
  field: string,
): DatasetIssue[] {
  const value = record[field];
  if (typeof value !== "string" || !value.trim()) {
    return [
      issue(recordIndex, bookId, field, "REQUIRED_STRING", field + " is required.", "error", value),
    ];
  }
  return [];
}

export function validateDataset(rawDataset: unknown): DatasetValidationResult {
  const dataset = asRecord(rawDataset);
  if (!dataset) {
    return {
      records: [],
      issues: [],
      total: 0,
      valid: 0,
      warnings: 0,
      invalid: 0,
      duplicates: 0,
      failedRelations: 0,
      topLevelErrors: ["Dataset root must be an object."],
    };
  }

  const requiredArrays = [
    "categories",
    "tags",
    "authors",
    "books",
    "book_authors",
    "book_tags",
    "ebooks",
    "book_files",
    "listings",
    "users",
    "profiles",
    "user_interests",
    "orders",
    "order_items",
    "reviews",
    "reading_progress",
    "reading_sessions",
    "bookmarks",
    "highlights",
    "community_posts",
    "comments",
    "reactions",
    "reports",
    "interaction_events",
    "daily_recommendations",
    "recommendation_evidence",
  ];
  const topLevelErrors = requiredArrays
    .filter((field) => !Array.isArray(dataset[field]))
    .map((field) => "Dataset field " + field + " must be an array.");

  const books = asArray(dataset.books);
  const categoryIds = collectNumericIds(asArray(dataset.categories));
  const authorIds = collectNumericIds(asArray(dataset.authors));
  const tagIds = collectNumericIds(asArray(dataset.tags));
  const ebookIds = collectNumericIds(asArray(dataset.ebooks));
  const authorsByBook = relationMap(asArray(dataset.book_authors), "book_id", "author_id");
  const tagsByBook = relationMap(asArray(dataset.book_tags), "book_id", "tag_id");
  const ebooksByBook = relationMap(asArray(dataset.ebooks), "book_id", "id");
  const filesByEbook = relationMap(asArray(dataset.book_files), "ebook_id", "id");
  const ebookRecordsByBook = recordsByNumericField(asArray(dataset.ebooks), "book_id");
  const fileRecordsByEbook = recordsByNumericField(asArray(dataset.book_files), "ebook_id");
  const listingsByBook = recordsByNumericField(asArray(dataset.listings), "book_id");
  const orderItemsByBook = recordsByNumericField(asArray(dataset.order_items), "book_id");
  const seenIds = new Set<number>();
  const records: ValidatedBookRecord[] = [];

  books.forEach((bookValue, recordIndex) => {
    const record = asRecord(bookValue);
    const issues: DatasetIssue[] = [];

    if (!record) {
      records.push({
        recordIndex,
        status: "INVALID",
        publishedYear: null,
        ratingAverage: null,
        issues: [issue(recordIndex, undefined, "record", "INVALID_OBJECT", "Book must be an object.", "error", bookValue)],
      });
      return;
    }

    const numericBookId = numericId(record.id);
    const bookId = stringId(record.id);
    const publishedYear = resolvePublishedYear(record);
    const ratingAverage = resolveRatingAverage(record);

    if (numericBookId === null) {
      issues.push(issue(recordIndex, bookId, "id", "INVALID_ID", "Book id must be a positive integer.", "error", record.id));
    }

    issues.push(...requiredStringIssues(record, recordIndex, bookId, "title"));

    if (typeof record.description !== "string" || !record.description.trim()) {
      issues.push(issue(recordIndex, bookId, "description", "MISSING_DESCRIPTION", "Description is missing.", "warning", record.description));
    }

    if (typeof record.language !== "string" || !record.language.trim()) {
      issues.push(issue(recordIndex, bookId, "language", "MISSING_LANGUAGE", "Language is missing.", "warning", record.language));
    }

    if (typeof record.cover_url !== "string" || !record.cover_url.trim()) {
      issues.push(issue(recordIndex, bookId, "cover_url", "MISSING_COVER", "Cover URL is missing.", "warning", record.cover_url));
    }

    if (numericBookId !== null) {
      for (const listing of listingsByBook.get(numericBookId) ?? []) {
        if (typeof listing.title !== "string" || !listing.title.trim()) {
          issues.push(
            issue(
              recordIndex,
              bookId,
              "listings.title",
              "LISTING_TITLE_FROM_BOOK",
              "Listing title is missing and will use the related book title.",
              "warning",
              listing.title,
            ),
          );
        }
        if (typeof listing.description !== "string" || !listing.description.trim()) {
          issues.push(
            issue(
              recordIndex,
              bookId,
              "listings.description",
              "LISTING_DESCRIPTION_FROM_BOOK",
              "Listing description is missing and will use the related book description.",
              "warning",
              listing.description,
            ),
          );
        }
      }

      for (const orderItem of orderItemsByBook.get(numericBookId) ?? []) {
        if (orderItem.line_total === null || typeof orderItem.line_total === "undefined") {
          issues.push(
            issue(
              recordIndex,
              bookId,
              "order_items.line_total",
              "ORDER_ITEM_TOTAL_DERIVED",
              "line_total is missing and will be calculated from unit_price and quantity.",
              "warning",
              orderItem.line_total,
            ),
          );
        }
      }
    }

    if (!publishedYear.valid) {
      issues.push(
        issue(
          recordIndex,
          bookId,
          publishedYear.sourceField,
          "INVALID_PUBLISHED_YEAR",
          "Published year must be an integer between 1000 and next year.",
          "error",
          record[publishedYear.sourceField],
        ),
      );
    } else if (publishedYear.value === null) {
      issues.push(issue(recordIndex, bookId, "published_year", "MISSING_PUBLISHED_YEAR", "Published year is missing.", "warning", null));
    }

    if (!ratingAverage.valid) {
      issues.push(
        issue(
          recordIndex,
          bookId,
          ratingAverage.sourceField,
          "INVALID_RATING",
          "Rating must be between 0 and 5.",
          "error",
          record[ratingAverage.sourceField],
        ),
      );
    } else if (ratingAverage.value === null) {
      issues.push(issue(recordIndex, bookId, "rating_avg", "MISSING_RATING", "Rating is missing.", "warning", null));
    }

    const createdAt = validDate(record.created_at);
    const updatedAt = validDate(record.updated_at);
    if (!createdAt) {
      issues.push(issue(recordIndex, bookId, "created_at", "INVALID_TIMESTAMP", "created_at is invalid.", "error", record.created_at));
    }
    if (record.updated_at !== null && typeof record.updated_at !== "undefined" && !updatedAt) {
      issues.push(issue(recordIndex, bookId, "updated_at", "INVALID_TIMESTAMP", "updated_at is invalid.", "error", record.updated_at));
    }
    if (createdAt && updatedAt && updatedAt < createdAt) {
      issues.push(issue(recordIndex, bookId, "updated_at", "TIMESTAMP_OUT_OF_ORDER", "updated_at is before created_at.", "warning", record.updated_at));
    }

    let duplicate = false;
    if (numericBookId !== null) {
      duplicate = seenIds.has(numericBookId);
      seenIds.add(numericBookId);
    }

    let failedRelation = false;
    if (numericBookId !== null) {
      const categoryId = numericId(record.category_id);
      const authorRelations = authorsByBook.get(numericBookId) ?? [];
      const tagRelations = tagsByBook.get(numericBookId) ?? [];
      const ebookRelations = ebooksByBook.get(numericBookId) ?? [];

      if (categoryId === null || !categoryIds.has(categoryId)) {
        failedRelation = true;
        issues.push(issue(recordIndex, bookId, "category_id", "MISSING_CATEGORY_RELATION", "Category relation is missing.", "error", record.category_id));
      }
      if (authorRelations.length === 0 || authorRelations.some((id) => !authorIds.has(id))) {
        failedRelation = true;
        issues.push(issue(recordIndex, bookId, "authors", "MISSING_AUTHOR_RELATION", "Author relation is missing or invalid.", "error", authorRelations));
      }
      if (tagRelations.length === 0 || tagRelations.some((id) => !tagIds.has(id))) {
        failedRelation = true;
        issues.push(issue(recordIndex, bookId, "tags", "MISSING_TAG_RELATION", "Tag relation is missing or invalid.", "error", tagRelations));
      }
      if (
        ebookRelations.length === 0 ||
        ebookRelations.some((id) => !ebookIds.has(id) || (filesByEbook.get(id) ?? []).length === 0)
      ) {
        failedRelation = true;
        issues.push(issue(recordIndex, bookId, "ebook", "MISSING_EBOOK_RELATION", "Ebook metadata or book file is missing.", "error", ebookRelations));
      } else {
        for (const ebook of ebookRecordsByBook.get(numericBookId) ?? []) {
          const ebookId = numericId(ebook.id);
          if (
            typeof ebook.file_format !== "string" ||
            (!ebook.html_url && !ebook.json_url) ||
            !validDate(ebook.created_at)
          ) {
            failedRelation = true;
            issues.push(
              issue(
                recordIndex,
                bookId,
                "ebook.metadata",
                "INVALID_EBOOK_METADATA",
                "Ebook format, URL or timestamp is invalid.",
                "error",
                ebook,
              ),
            );
          }

          if (ebookId !== null) {
            const files = fileRecordsByEbook.get(ebookId) ?? [];
            if (
              files.length === 0 ||
              files.some(
                (file) =>
                  typeof file.file_url !== "string" ||
                  !file.file_url.trim() ||
                  typeof file.checksum !== "string" ||
                  !file.checksum.trim(),
              )
            ) {
              failedRelation = true;
              issues.push(
                issue(
                  recordIndex,
                  bookId,
                  "book_files",
                  "INVALID_BOOK_FILE",
                  "Book file URL or checksum is invalid.",
                  "error",
                  files,
                ),
              );
            }
          }
        }
      }
    }

    const hasError = issues.some((item) => item.severity === "error");
    let status: DatasetRecordStatus = "VALID";
    if (duplicate) {
      status = "SKIPPED_DUPLICATE";
    } else if (failedRelation) {
      status = "FAILED_RELATION";
    } else if (hasError) {
      status = "INVALID";
    } else if (issues.length > 0) {
      status = "VALID_WITH_WARNINGS";
    }

    records.push({
      recordIndex,
      bookId,
      status,
      publishedYear: publishedYear.value,
      ratingAverage: ratingAverage.value,
      issues,
    });
  });

  const allIssues = records.flatMap((record) => record.issues);
  return {
    records,
    issues: allIssues,
    total: records.length,
    valid: records.filter((record) => record.status === "VALID").length,
    warnings: records.filter((record) => record.status === "VALID_WITH_WARNINGS").length,
    invalid: records.filter((record) => record.status === "INVALID").length,
    duplicates: records.filter((record) => record.status === "SKIPPED_DUPLICATE").length,
    failedRelations: records.filter((record) => record.status === "FAILED_RELATION").length,
    topLevelErrors,
  };
}

function duplicateCount(values: unknown[]): number {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (value === null || typeof value === "undefined" || String(value).trim() === "") {
      continue;
    }
    const key = String(value).trim().toLocaleLowerCase("vi-VN");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.values()].reduce((total, count) => total + (count > 1 ? count - 1 : 0), 0);
}

function countSingleRelations(rows: unknown[], ownerField: string): number {
  const counts = new Map<number, number>();
  for (const item of rows) {
    const ownerId = numericId(asRecord(item)?.[ownerField]);
    if (ownerId !== null) {
      counts.set(ownerId, (counts.get(ownerId) ?? 0) + 1);
    }
  }
  return [...counts.values()].filter((count) => count === 1).length;
}

export function analyzeDataset(rawDataset: unknown, now = new Date()): DatasetAnalysis {
  const dataset = asRecord(rawDataset) ?? {};
  const books = asArray(dataset.books);
  const categories = asArray(dataset.categories);
  const authors = asArray(dataset.authors);
  const tags = asArray(dataset.tags);
  const validation = validateDataset(rawDataset);
  const missingFields: Record<string, number> = {};
  const fields = ["id", "title", "description", "language", "category_id", "cover_url", "created_at"];

  for (const field of fields) {
    missingFields[field] = books.filter((book) => {
      const value = asRecord(book)?.[field];
      return value === null || typeof value === "undefined" || value === "";
    }).length;
  }

  missingFields.published_year = books.filter((book) => {
    const record = asRecord(book) ?? {};
    return record.published_year === null && record.publication_year === null;
  }).length;
  missingFields.rating_avg = books.filter((book) => {
    const record = asRecord(book) ?? {};
    return record.rating_avg === null && record.rating_average === null;
  }).length;

  const categoryBookCounts = new Map<number, number>();
  for (const book of books) {
    const categoryId = numericId(asRecord(book)?.category_id);
    if (categoryId !== null) {
      categoryBookCounts.set(categoryId, (categoryBookCounts.get(categoryId) ?? 0) + 1);
    }
  }

  const categoryIds = collectNumericIds(categories);
  const invalidParentCategories = categories.filter((category) => {
    const parentId = numericId(asRecord(category)?.parent_id);
    return parentId !== null && !categoryIds.has(parentId);
  }).length;

  let futureTimestamps = 0;
  let outOfOrderTimestamps = 0;
  for (const [collectionName, value] of Object.entries(dataset)) {
    if (!Array.isArray(value)) {
      continue;
    }
    for (const item of value) {
      const record = asRecord(item);
      if (!record) {
        continue;
      }
      const timestampFields = Object.keys(record).filter(
        (field) => field.endsWith("_at") || field === "timestamp",
      );
      for (const field of timestampFields) {
        const date = validDate(record[field]);
        if (date && date > now) {
          futureTimestamps += 1;
        }
      }
      const createdAt = validDate(record.created_at);
      const updatedAt = validDate(record.updated_at);
      if (createdAt && updatedAt && updatedAt < createdAt) {
        outOfOrderTimestamps += 1;
      }
    }
    void collectionName;
  }

  return {
    generatedAt: new Date().toISOString(),
    totalBooks: books.length,
    missingIds: books.filter((book) => numericId(asRecord(book)?.id) === null).length,
    duplicateIds: duplicateCount(books.map((book) => asRecord(book)?.id)),
    duplicateTitles: duplicateCount(books.map((book) => asRecord(book)?.title)),
    duplicateDescriptions: duplicateCount(books.map((book) => asRecord(book)?.description)),
    uniqueAuthors: collectNumericIds(authors).size,
    uniqueCategories: categoryIds.size,
    uniqueTags: collectNumericIds(tags).size,
    categoriesWithOneBook: [...categoryBookCounts.values()].filter((count) => count === 1).length,
    authorsWithOneBook: countSingleRelations(asArray(dataset.book_authors), "author_id"),
    missingFields,
    invalidFieldTypes: validation.issues.filter((item) =>
      ["INVALID_ID", "REQUIRED_STRING", "INVALID_TIMESTAMP"].includes(item.code),
    ).length,
    invalidRatings: validation.issues.filter((item) => item.code === "INVALID_RATING").length,
    invalidPublishedYears: validation.issues.filter((item) => item.code === "INVALID_PUBLISHED_YEAR").length,
    invalidParentCategories,
    futureTimestamps,
    outOfOrderTimestamps,
    validation: {
      total: validation.total,
      valid: validation.valid,
      warnings: validation.warnings,
      invalid: validation.invalid,
      duplicates: validation.duplicates,
      failedRelations: validation.failedRelations,
      topLevelErrors: validation.topLevelErrors,
    },
  };
}

export function toSafeDatasetIssueValue(value: unknown): unknown {
  return safeValue(value);
}
