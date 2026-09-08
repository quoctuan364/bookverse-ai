import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import {
  COVER_POLICY,
  isAllowedFinalCoverUrl,
  isValidCoverImageBytes,
  isUsableCoverDimensions,
} from "@/lib/cover-policy";
import {
  calculateGoldQualityScore,
  deriveGoldQualityTier,
  hardRejectReasons,
  normalizeIsbn,
  normalizeText,
  sha256,
  stableStringify,
  type GoldCatalogRecord,
  type GoldQualityTier,
} from "@/lib/gold-catalog";

interface SourceBook {
  id: string;
  title: string | null;
  subtitle: string | null;
  isbn: string | null;
  isbnStatus: string | null;
  languages: string[];
  publisher: string | null;
  publishedYear: number | null;
  pageCount: number | null;
  primaryCategoryId: string | null;
  coverUrl: string | null;
  coverId: number | null;
  openLibraryWorkKey: string | null;
  openLibraryEditionKey: string | null;
  openLibraryWorkUrl: string | null;
  openLibraryEditionUrl: string | null;
  isVietnameseEdition: boolean;
  sourceQueries: string[];
}

interface SourceCategory {
  id: string;
  slug: string;
  name: string;
}

interface SourceAuthor {
  id: string;
  name: string;
}

interface SourceLink {
  bookId: string;
  authorId?: string;
  categoryId?: string;
  position?: string | number;
}

interface MappingEntry {
  sourceId: string;
  sourceSlug: string;
  sourceName: string;
  targetCanonicalKey: string;
  targetCanonicalName: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  rationale: string;
  ambiguity?: string;
}

interface CoverRow {
  bookId: string;
  originalUrl: string;
  finalUrl: string | null;
  finalHost: string | null;
  httpStatus: number | null;
  contentType: string | null;
  width: number | null;
  height: number | null;
  contentSha256: string | null;
  status: string;
  rightsStatus: "NOT_VERIFIED";
}

interface WorkApiResponse {
  key?: string;
  title?: string;
  description?: string | { value?: string } | null;
}

interface CachedWorkResponse {
  url: string;
  retrievedAt: string;
  status: number;
  body: WorkApiResponse | null;
}

interface CoverAuditResult extends CoverRow {
  technicalStatus: "TECHNICALLY_VERIFIED" | "TECHNICALLY_INVALID" | "NOT_VERIFIED";
  redirectCount: number;
  redirectChain: string[];
  bytes: number | null;
  aspectRatio: number | null;
  errorCode: string | null;
}

const root = process.cwd();
const sourcePath = path.join(root, "data", "real-catalog", "bookverse_real_catalog.json");
const mappingPath = path.join(root, "config", "real-catalog-category-mapping.json");
const configuredCoverAuditPath = process.env.GOLD_CATALOG_COVER_AUDIT_PATH;
const outputRoot = path.join(root, "data", "gold-catalog-v1");
const rawRoot = path.join(outputRoot, "raw", "open-library-work");
const coverCacheRoot = path.join(outputRoot, "raw", "cover-audit");
const normalizedRoot = path.join(outputRoot, "normalized");
const manifestRoot = path.join(outputRoot, "manifests");
const reportRoot = path.join(outputRoot, "reports");
const rejectedRoot = path.join(outputRoot, "rejected");
const userAgent = "BookVerseAI/GoldCatalogPilot/1.0 (academic graduation project)";
const limit = Number(process.env.GOLD_CATALOG_PILOT_LIMIT ?? "300");
const candidateLimit = Number(process.env.GOLD_CATALOG_CANDIDATE_LIMIT ?? "360");

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`INVALID_${name}`);
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function getLatestCoverAudit(): Promise<string> {
  if (configuredCoverAuditPath) return configuredCoverAuditPath;
  const directory = path.join(root, "outputs", "real-catalog-cover-audit");
  const names = (await fs.readdir(directory)).filter((name) => /^cover-audit-.*\.json$/u.test(name)).sort();
  const latest = names.at(-1);
  if (!latest) throw new Error("GOLD_CATALOG_COVER_AUDIT_NOT_AVAILABLE");
  return path.join(directory, latest);
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

async function readCachedWork(workKey: string): Promise<CachedWorkResponse> {
  const safeKey = workKey.replace(/[^A-Za-z0-9_-]/gu, "_");
  const cachePath = path.join(rawRoot, `${safeKey}.json`);
  try {
    return await readJson<CachedWorkResponse>(cachePath);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const url = `https://openlibrary.org${workKey}.json`;
  let lastError = "UNKNOWN";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await sleep(250 * 2 ** (attempt - 1));
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": userAgent },
        signal: AbortSignal.timeout(20_000),
      });
      const body = response.ok ? ((await response.json()) as WorkApiResponse) : null;
      const cached: CachedWorkResponse = {
        url,
        retrievedAt: new Date().toISOString(),
        status: response.status,
        body,
      };
      await fs.writeFile(cachePath, `${JSON.stringify(cached, null, 2)}\n`, "utf8");
      return cached;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error.message : "UNKNOWN";
      if (attempt === 3) break;
    }
  }
  throw new Error(`OPEN_LIBRARY_WORK_FETCH_FAILED:${workKey}:${lastError}`);
}

function descriptionFromResponse(response: CachedWorkResponse): string | null {
  const description = response.body?.description;
  if (typeof description === "string") return normalizeText(description);
  if (description && typeof description === "object") return normalizeText(description.value);
  return null;
}

function normalizeIsbnFields(value: string | null): { isbn10: string | null; isbn13: string | null } {
  const isbn = normalizeIsbn(value);
  if (!isbn) return { isbn10: null, isbn13: null };
  if (isbn.length === 10) return { isbn10: isbn, isbn13: null };
  if (isbn.length === 13) return { isbn10: null, isbn13: isbn };
  return { isbn10: isbn, isbn13: null };
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

async function auditCoverUncached(book: SourceBook): Promise<CoverAuditResult> {
  const base: CoverAuditResult = {
    bookId: book.id,
    originalUrl: book.coverUrl ?? "",
    finalUrl: null,
    finalHost: null,
    httpStatus: null,
    contentType: null,
    width: null,
    height: null,
    contentSha256: null,
    status: "NOT_VERIFIED",
    rightsStatus: "NOT_VERIFIED",
    technicalStatus: "NOT_VERIFIED",
    redirectCount: 0,
    redirectChain: book.coverUrl ? [book.coverUrl] : [],
    bytes: null,
    aspectRatio: null,
    errorCode: null,
  };
  if (!book.coverUrl) return { ...base, status: "NOT_VERIFIED", technicalStatus: "TECHNICALLY_INVALID", errorCode: "MISSING_COVER_URL" };

  let currentUrl = book.coverUrl;
  const redirectChain = [currentUrl];
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await sleep(250);
    try {
      const response = await fetch(currentUrl, {
        redirect: "manual",
        headers: { Accept: "image/*", "User-Agent": userAgent },
        signal: AbortSignal.timeout(15_000),
      });
      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) {
        const nextUrl = new URL(location, currentUrl).toString();
        if (redirectChain.length > COVER_POLICY.maxRedirects || !isAllowedFinalCoverUrl(nextUrl)) {
          return { ...base, finalUrl: nextUrl, finalHost: hostOf(nextUrl), httpStatus: response.status, redirectCount: redirectChain.length, redirectChain: [...redirectChain, nextUrl], status: "NOT_VERIFIED", technicalStatus: "TECHNICALLY_INVALID", errorCode: "REDIRECT_HOST_NOT_ALLOWLISTED" };
        }
        redirectChain.push(nextUrl);
        currentUrl = nextUrl;
        continue;
      }
      const contentType = response.headers.get("content-type");
      const finalBase = { ...base, finalUrl: currentUrl, finalHost: hostOf(currentUrl), httpStatus: response.status, contentType, redirectCount: redirectChain.length - 1, redirectChain };
      if (response.status !== 200) return { ...finalBase, status: response.status === 404 ? "NOT_FOUND" : "NOT_VERIFIED", technicalStatus: "TECHNICALLY_INVALID", errorCode: `HTTP_${response.status}` };
      if (!contentType?.toLowerCase().startsWith("image/")) return { ...finalBase, status: "NOT_VERIFIED", technicalStatus: "TECHNICALLY_INVALID", errorCode: "CONTENT_TYPE_NOT_IMAGE" };
      const buffer = Buffer.from(await response.arrayBuffer());
      const contentSha256 = sha256(buffer);
      if (!isValidCoverImageBytes(buffer.length)) return { ...finalBase, bytes: buffer.length, contentSha256, status: "NOT_VERIFIED", technicalStatus: "TECHNICALLY_INVALID", errorCode: "IMAGE_BYTES_OUT_OF_RANGE" };
      const metadata = await sharp(buffer, { failOn: "error" }).metadata();
      const width = metadata.width ?? null;
      const height = metadata.height ?? null;
      const aspectRatio = width && height ? Number((width / height).toFixed(6)) : null;
      if (!width || !height || !isUsableCoverDimensions(width, height)) return { ...finalBase, bytes: buffer.length, contentSha256, width, height, aspectRatio, status: "NOT_VERIFIED", technicalStatus: "TECHNICALLY_INVALID", errorCode: "DIMENSION_OR_RATIO_OUT_OF_RANGE" };
      return { ...finalBase, bytes: buffer.length, contentSha256, width, height, aspectRatio, status: "HTTP_VERIFIED", technicalStatus: "TECHNICALLY_VERIFIED", errorCode: null };
    } catch (error: unknown) {
      if (attempt === 3) return { ...base, finalUrl: currentUrl, finalHost: hostOf(currentUrl), redirectCount: redirectChain.length - 1, redirectChain, status: "NOT_VERIFIED", technicalStatus: "TECHNICALLY_INVALID", errorCode: error instanceof Error ? error.message : "COVER_FETCH_FAILED" };
    }
  }
  return { ...base, finalUrl: currentUrl, finalHost: hostOf(currentUrl), redirectCount: redirectChain.length - 1, redirectChain, status: "NOT_VERIFIED", technicalStatus: "TECHNICALLY_INVALID", errorCode: "REDIRECT_CHAIN_EXHAUSTED" };
}

async function auditCover(book: SourceBook): Promise<CoverAuditResult> {
  const cachePath = path.join(coverCacheRoot, `${book.id}.json`);
  try {
    return await readJson<CoverAuditResult>(cachePath);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const result = await auditCoverUncached(book);
  await fs.writeFile(cachePath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return result;
}

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function normalizedCore(record: GoldCatalogRecord): Record<string, unknown> {
  const core: Record<string, unknown> = { ...record };
  delete core.normalizedChecksum;
  delete core.retrievedAt;
  delete core.metadataQualityScore;
  delete core.qualityTier;
  delete core.rejectionReasons;
  return core;
}

async function main(): Promise<void> {
  assertPositiveInteger(limit, "PILOT_LIMIT");
  assertPositiveInteger(candidateLimit, "CANDIDATE_LIMIT");
  if (candidateLimit < limit) throw new Error("CANDIDATE_LIMIT_MUST_NOT_BE_SMALLER_THAN_PILOT_LIMIT");
  await Promise.all([normalizedRoot, manifestRoot, reportRoot, rejectedRoot, rawRoot, coverCacheRoot].map((directory) => fs.mkdir(directory, { recursive: true })));

  const source = await readJson<{ meta: { generatedAt: string }; categories: SourceCategory[]; authors: SourceAuthor[]; books: SourceBook[]; bookAuthors: SourceLink[]; bookCategories: SourceLink[] }>(sourcePath);
  const mapping = await readJson<{ schemaVersion: string; entries: MappingEntry[] }>(mappingPath);
  const coverAuditPath = await getLatestCoverAudit();
  const coverAudit = await readJson<{ catalogChecksum: string; rows: CoverRow[] }>(coverAuditPath);
  const sourceCatalogChecksum = sha256(await fs.readFile(sourcePath));
  const authorsById = new Map(source.authors.map((author) => [author.id, author.name]));
  const categoriesById = new Map(source.categories.map((category) => [category.id, category]));
  const mappingBySourceId = new Map(mapping.entries.map((entry) => [entry.sourceId, entry]));
  const coversByBookId = new Map(coverAudit.rows.map((row) => [row.bookId, row]));
  const authorsByBookId = new Map<string, string[]>();
  const categoriesByBookId = new Map<string, string[]>();
  for (const link of source.bookAuthors) {
    const author = link.authorId ? authorsById.get(link.authorId) : null;
    if (!author) continue;
    authorsByBookId.set(link.bookId, [...(authorsByBookId.get(link.bookId) ?? []), author]);
  }
  for (const link of source.bookCategories) {
    if (!link.categoryId) continue;
    categoriesByBookId.set(link.bookId, [...(categoriesByBookId.get(link.bookId) ?? []), link.categoryId]);
  }

  const eligible = source.books.filter((book) => {
    const authors = authorsByBookId.get(book.id) ?? [];
    const sourceCategoryIds = categoriesByBookId.get(book.id) ?? [book.primaryCategoryId ?? ""];
    const hasApprovedCategory = sourceCategoryIds.some((categoryId) => mappingBySourceId.get(categoryId)?.confidence !== "LOW");
    const cover = coversByBookId.get(book.id);
    const hasValidIsbn = normalizeIsbnFields(book.isbn).isbn10 !== null || normalizeIsbnFields(book.isbn).isbn13 !== null;
    return Boolean(
      normalizeText(book.title) &&
      authors.length > 0 &&
      book.openLibraryEditionKey &&
      (book.openLibraryWorkKey || book.openLibraryEditionKey) &&
      book.coverUrl &&
      hasValidIsbn &&
      book.languages.length > 0 &&
      book.publisher &&
      book.publishedYear &&
      book.pageCount &&
      hasApprovedCategory &&
      cover &&
      ["HTTP_VERIFIED", "REDIRECT_EXTERNAL"].includes(cover.status),
    );
  });
  const categoryBuckets = new Map<string, SourceBook[]>();
  for (const book of eligible) {
    const key = book.primaryCategoryId ?? "UNMAPPED";
    categoryBuckets.set(key, [...(categoryBuckets.get(key) ?? []), book]);
  }
  const selectedIds = new Set<string>();
  const orderedCategories = [...categoryBuckets.keys()].sort();
  for (const categoryId of orderedCategories) {
    const bucket = [...(categoryBuckets.get(categoryId) ?? [])].sort((left, right) => Number(right.isVietnameseEdition) - Number(left.isVietnameseEdition) || left.id.localeCompare(right.id));
    for (const book of bucket.slice(0, 12)) selectedIds.add(book.id);
  }
  const remaining = eligible
    .filter((book) => !selectedIds.has(book.id))
    .sort((left, right) => Number(right.isVietnameseEdition) - Number(left.isVietnameseEdition) || left.id.localeCompare(right.id));
  for (const book of remaining) {
    if (selectedIds.size >= candidateLimit) break;
    selectedIds.add(book.id);
  }
  const candidates = eligible.filter((book) => selectedIds.has(book.id)).sort((left, right) => Number(right.isVietnameseEdition) - Number(left.isVietnameseEdition) || left.id.localeCompare(right.id)).slice(0, candidateLimit);

  const recordResults: Array<{ record: GoldCatalogRecord; cover: CoverAuditResult }> = [];
  for (let offset = 0; offset < candidates.length; offset += 8) {
    const chunkResults = await Promise.all(candidates.slice(offset, offset + 8).map(async (book, chunkIndex) => {
    const index = offset + chunkIndex;
    process.stdout.write(`[gold-pilot] metadata ${index + 1}/${candidates.length} ${book.id}\n`);
    const workKey = book.openLibraryWorkKey ?? book.openLibraryEditionKey;
    const cached = workKey ? await readCachedWork(workKey) : { url: "", retrievedAt: source.meta.generatedAt, status: 0, body: null };
    const description = descriptionFromResponse(cached);
    const authors = authorsByBookId.get(book.id) ?? [];
    const sourceCategoryIds = categoriesByBookId.get(book.id) ?? (book.primaryCategoryId ? [book.primaryCategoryId] : []);
    const sourceCategories = sourceCategoryIds.map((id) => categoriesById.get(id)?.slug ?? id).filter(Boolean);
    const canonicalCategoryKeys = [...new Set(sourceCategoryIds.map((id) => mappingBySourceId.get(id)).filter((entry): entry is MappingEntry => Boolean(entry && entry.confidence !== "LOW")).map((entry) => entry.targetCanonicalKey))];
    const isbn = normalizeIsbnFields(book.isbn);
    const coverAuditResult = await auditCover(book);
    const providerWorkId = book.openLibraryWorkKey;
    const providerEditionId = book.openLibraryEditionKey;
    const sourceUrl = book.openLibraryEditionUrl ?? book.openLibraryWorkUrl;
    const baseRecord: GoldCatalogRecord = {
      catalogId: book.id,
      recordType: providerWorkId ? "WORK" : "EDITION",
      title: normalizeText(book.title) ?? "",
      subtitle: normalizeText(book.subtitle),
      authors,
      description,
      language: book.languages[0] ?? null,
      publisher: normalizeText(book.publisher),
      publishedDate: null,
      publishedYear: book.publishedYear ?? null,
      isbn10: isbn.isbn10,
      isbn13: isbn.isbn13,
      pageCount: book.pageCount ?? null,
      sourceCategories,
      canonicalCategoryKeys,
      coverUrl: book.coverUrl,
      coverProvider: "OPEN_LIBRARY_COVERS_API",
      coverFinalUrl: coverAuditResult.finalUrl,
      coverWidth: coverAuditResult.width,
      coverHeight: coverAuditResult.height,
      coverHttpStatus: coverAuditResult.httpStatus,
      coverContentType: coverAuditResult.contentType,
      coverTechnicalStatus: coverAuditResult.technicalStatus,
      coverRightsStatus: "RIGHTS_NOT_VERIFIED",
      provider: "OPEN_LIBRARY",
      providerBookId: providerEditionId ?? providerWorkId,
      providerWorkId,
      providerEditionId,
      sourceUrl,
      retrievedAt: cached.retrievedAt,
      rawChecksum: cached.body ? sha256(stableStringify(cached.body)) : null,
      normalizedChecksum: "",
      metadataQualityScore: 0,
      qualityTier: "REJECTED",
      rejectionReasons: [],
    };
    baseRecord.normalizedChecksum = sha256(stableStringify(normalizedCore(baseRecord)));
    baseRecord.rejectionReasons = hardRejectReasons(baseRecord);
    baseRecord.metadataQualityScore = calculateGoldQualityScore({ ...baseRecord, normalizedChecksum: baseRecord.normalizedChecksum });
    baseRecord.qualityTier = deriveGoldQualityTier(baseRecord.metadataQualityScore, baseRecord.coverTechnicalStatus, baseRecord.rejectionReasons);
    return { record: baseRecord, cover: coverAuditResult };
    }));
    recordResults.push(...chunkResults);
  }
  const records: GoldCatalogRecord[] = recordResults.map((result) => result.record);
  const coverRows: CoverAuditResult[] = recordResults.map((result) => result.cover);

  const selected = records
    .filter((record) => record.qualityTier === "GOLD" || record.qualityTier === "FEATURED")
    .sort((left, right) => right.metadataQualityScore - left.metadataQualityScore || Number(source.books.find((book) => book.id === left.catalogId)?.isVietnameseEdition ?? false) - Number(source.books.find((book) => book.id === right.catalogId)?.isVietnameseEdition ?? false) || left.catalogId.localeCompare(right.catalogId))
    .slice(0, limit)
    .sort((left, right) => left.catalogId.localeCompare(right.catalogId));
  const rejected = records.filter((record) => !selected.some((item) => item.catalogId === record.catalogId));
  const categoryMapping = mapping.entries.map((entry) => ({
    ...entry,
    reviewerStatus: entry.confidence === "LOW" ? "NEEDS_REVIEW" : "APPROVED",
    sampleTitleEvidence: selected.filter((record) => record.sourceCategories.includes(entry.sourceSlug)).slice(0, 3).map((record) => record.title),
  }));
  const categoryMappingPayload = {
    schemaVersion: "gold-catalog-category-mapping.v1",
    sourceMappingSchemaVersion: mapping.schemaVersion,
    sourceCatalogChecksum,
    checksum: sha256(stableStringify(categoryMapping)),
    entries: categoryMapping,
  };
  const qualityCounts = records.reduce<Record<GoldQualityTier, number>>((counts, record) => {
    counts[record.qualityTier] += 1;
    return counts;
  }, { GOLD: 0, FEATURED: 0, REVIEW: 0, REJECTED: 0 });
  const pilotPayload = JSON.stringify(selected, null, 2);
  const artifactChecksum = sha256(pilotPayload);
  const manifest = {
    schemaVersion: "gold-catalog-v1.pilot.v1",
    sourceCatalogChecksum,
    sourceCatalogGeneratedAt: source.meta.generatedAt,
    sourceProvider: "OPEN_LIBRARY",
    googleBooksStatus: "BLOCKED_MISSING_CREDENTIAL",
    coverRightsStatus: "RIGHTS_NOT_VERIFIED",
    pilotLimit: limit,
    selectedCount: selected.length,
    qualityCounts,
    workCount: selected.filter((record) => record.recordType === "WORK").length,
    editionCount: selected.filter((record) => record.recordType === "EDITION").length,
    vietnameseEditionCount: selected.filter((record) => record.language === "vie").length,
    featuredCount: selected.filter((record) => record.qualityTier === "FEATURED").length,
    artifactChecksum,
    recordIds: selected.map((record) => record.catalogId),
  };
  const csvHeaders = Object.keys(selected[0] ?? { catalogId: "" });
  const csvRows = selected.map((record) => csvHeaders.map((header) => csvCell(Array.isArray(record[header as keyof GoldCatalogRecord]) ? (record[header as keyof GoldCatalogRecord] as string[]).join("|") : record[header as keyof GoldCatalogRecord])).join(","));
  await fs.writeFile(path.join(normalizedRoot, "pilot-300.json"), `${pilotPayload}\n`, "utf8");
  await fs.writeFile(path.join(normalizedRoot, "pilot-300.csv"), `${csvHeaders.join(",")}\n${csvRows.join("\n")}\n`, "utf8");
  await fs.writeFile(path.join(manifestRoot, "pilot-300-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(manifestRoot, "category-mapping-v1.json"), `${JSON.stringify(categoryMappingPayload, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(reportRoot, "category-coverage.json"), `${JSON.stringify({ schemaVersion: "gold-catalog-category-coverage.v1", sourceMappingChecksum: categoryMappingPayload.checksum, selectedCount: selected.length, bySourceCategory: categoryMapping.map((entry) => ({ sourceSlug: entry.sourceSlug, reviewerStatus: entry.reviewerStatus, count: selected.filter((record) => record.sourceCategories.includes(entry.sourceSlug)).length, sampleTitleEvidence: entry.sampleTitleEvidence })), lowNeedsReviewCount: categoryMapping.filter((entry) => entry.reviewerStatus === "NEEDS_REVIEW").length }, null, 2)}\n`, "utf8");
  const completenessFields: Array<keyof GoldCatalogRecord> = ["title", "authors", "description", "language", "publisher", "publishedDate", "publishedYear", "isbn10", "isbn13", "pageCount", "canonicalCategoryKeys", "coverUrl", "coverTechnicalStatus", "providerBookId", "sourceUrl"];
  const fieldPresent = (record: GoldCatalogRecord, field: keyof GoldCatalogRecord): boolean => {
    const value = record[field];
    return Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined && value !== "";
  };
  const completeness = Object.fromEntries(completenessFields.map((field) => {
    const present = selected.filter((record) => fieldPresent(record, field)).length;
    return [field, { present, total: selected.length, percentage: selected.length === 0 ? 0 : Number((present / selected.length * 100).toFixed(2)) }];
  }));
  const dedupKeys = ["isbn13", "isbn10", "providerEditionId", "providerWorkId"] as const;
  const duplicateGroups = Object.fromEntries(dedupKeys.map((key) => [key, [...new Set(selected.map((record) => record[key]).filter((value): value is string => Boolean(value)))].map((value) => ({ value, catalogIds: selected.filter((record) => record[key] === value).map((record) => record.catalogId) })).filter((group) => group.catalogIds.length > 1)]));
  await fs.writeFile(path.join(reportRoot, "metadata-completeness.json"), `${JSON.stringify({ schemaVersion: "gold-catalog-metadata-completeness.v1", selectedCount: selected.length, fields: completeness }, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(reportRoot, "dedup-report.json"), `${JSON.stringify({ schemaVersion: "gold-catalog-dedup.v1", policy: ["ISBN13", "ISBN10", "PROVIDER_EDITION_ID", "PROVIDER_WORK_ID_PLUS_NORMALIZED_TITLE_AUTHOR"], selectedCount: selected.length, duplicateGroups, duplicateGroupCount: Object.values(duplicateGroups).reduce((sum, groups) => sum + groups.length, 0), fuzzyMatches: "NOT_RUN; fuzzy match chỉ đưa vào review, không tự merge" }, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(reportRoot, "cover-audit.json"), `${JSON.stringify({ schemaVersion: "gold-catalog-cover-audit.v1", provider: "OPEN_LIBRARY_COVERS_API", rightsStatus: "RIGHTS_NOT_VERIFIED", threshold: { minBytes: COVER_POLICY.minImageBytes, minWidth: COVER_POLICY.minWidth, minHeight: COVER_POLICY.minHeight, minAspectRatio: COVER_POLICY.minAspectRatio, maxAspectRatio: COVER_POLICY.maxAspectRatio }, auditedCount: coverRows.length, technicallyVerifiedCount: coverRows.filter((row) => row.technicalStatus === "TECHNICALLY_VERIFIED").length, technicallyInvalidCount: coverRows.filter((row) => row.technicalStatus === "TECHNICALLY_INVALID").length, rows: coverRows }, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(reportRoot, "quality-report.json"), `${JSON.stringify({ schemaVersion: "gold-catalog-quality.v1", sourceCatalogChecksum, candidateCount: candidates.length, selectedCount: selected.length, qualityCounts, scoreRule: "gold-catalog-quality-v1", hardRejectRule: "fail-closed", selectedRecordIds: selected.map((record) => record.catalogId) }, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(rejectedRoot, "pilot-300-rejected.json"), `${JSON.stringify(rejected, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(outputRoot, "BUILD_STATUS.json"), `${JSON.stringify({ status: selected.length >= limit ? "VERIFIED" : "PARTIAL", sourceCatalogChecksum, candidates: candidates.length, selected: selected.length, qualityCounts, generatedFromCachedSource: true, rawCachePath: "raw/open-library-work/", rightsStatus: "RIGHTS_NOT_VERIFIED" }, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ status: selected.length >= limit ? "VERIFIED" : "PARTIAL", candidates: candidates.length, selected: selected.length, qualityCounts, vietnameseEditionCount: manifest.vietnameseEditionCount, featuredCount: manifest.featuredCount, artifactChecksum }, null, 2)}\n`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
