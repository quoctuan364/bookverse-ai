import { createHash } from "node:crypto";

export type GoldRecordType = "WORK" | "EDITION";
export type GoldQualityTier = "GOLD" | "FEATURED" | "REVIEW" | "REJECTED";

export interface GoldCatalogRecord {
  catalogId: string;
  recordType: GoldRecordType;
  title: string;
  subtitle: string | null;
  authors: string[];
  description: string | null;
  language: string | null;
  publisher: string | null;
  publishedDate: string | null;
  publishedYear: number | null;
  isbn10: string | null;
  isbn13: string | null;
  pageCount: number | null;
  sourceCategories: string[];
  canonicalCategoryKeys: string[];
  coverUrl: string | null;
  coverProvider: string | null;
  coverFinalUrl: string | null;
  coverWidth: number | null;
  coverHeight: number | null;
  coverHttpStatus: number | null;
  coverContentType: string | null;
  coverTechnicalStatus: "TECHNICALLY_VERIFIED" | "TECHNICALLY_INVALID" | "NOT_VERIFIED";
  coverRightsStatus: "RIGHTS_VERIFIED" | "RIGHTS_NOT_VERIFIED";
  provider: string;
  providerBookId: string | null;
  providerWorkId: string | null;
  providerEditionId: string | null;
  sourceUrl: string | null;
  retrievedAt: string;
  rawChecksum: string | null;
  normalizedChecksum: string;
  metadataQualityScore: number;
  qualityTier: GoldQualityTier;
  rejectionReasons: string[];
}

export interface GoldScoreInput {
  title: string;
  authors: string[];
  providerBookId: string | null;
  isbn10: string | null;
  isbn13: string | null;
  description: string | null;
  publisher: string | null;
  publishedDate: string | null;
  publishedYear: number | null;
  language: string | null;
  pageCount: number | null;
  canonicalCategoryKeys: string[];
  coverTechnicalStatus: GoldCatalogRecord["coverTechnicalStatus"];
  sourceUrl: string | null;
  rawChecksum: string | null;
  normalizedChecksum?: string | null;
}

export function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/gu, " ").trim();
  return normalized || null;
}

export function normalizeIsbn(value: unknown): string | null {
  const normalized = typeof value === "string" ? value.replace(/[\s-]/gu, "").toUpperCase() : "";
  return normalized || null;
}

export function isValidIsbn10(value: string | null): boolean {
  if (!value || !/^\d{9}[\dX]$/u.test(value)) return false;
  const sum = value.split("").reduce((total, char, index) => total + (char === "X" ? 10 : Number(char)) * (10 - index), 0);
  return sum % 11 === 0;
}

export function isValidIsbn13(value: string | null): boolean {
  if (!value || !/^\d{13}$/u.test(value)) return false;
  const sum = value.split("").reduce((total, char, index) => total + Number(char) * (index % 2 === 0 ? 1 : 3), 0);
  return sum % 10 === 0;
}

export function hasSyntheticPattern(value: string | null): boolean {
  return Boolean(value && (/#\d{3,}\b/u.test(value) || /\s\d{4,}$/.test(value)));
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(",")}}`;
}

export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function calculateGoldQualityScore(input: GoldScoreInput): number {
  let score = 0;
  if (normalizeText(input.title) && !hasSyntheticPattern(input.title)) score += 10;
  if (input.authors.length > 0 && input.authors.every((author) => !hasSyntheticPattern(author))) score += 10;
  if (input.providerBookId) score += 10;
  if (isValidIsbn10(input.isbn10)) score += 5;
  if (isValidIsbn13(input.isbn13)) score += 5;
  if (input.description && input.description.trim().length >= 80) score += 15;
  if (normalizeText(input.publisher)) score += 5;
  if (input.publishedDate || input.publishedYear !== null) score += 5;
  if (normalizeText(input.language)) score += 5;
  if (Number.isInteger(input.pageCount) && (input.pageCount ?? 0) > 0) score += 5;
  if (input.canonicalCategoryKeys.length > 0) score += 10;
  if (input.coverTechnicalStatus === "TECHNICALLY_VERIFIED") score += 10;
  if (input.sourceUrl && input.rawChecksum && input.normalizedChecksum) score += 5;
  return score;
}

export function deriveGoldQualityTier(score: number, coverTechnicalStatus: GoldCatalogRecord["coverTechnicalStatus"], rejectionReasons: string[]): GoldQualityTier {
  if (rejectionReasons.length > 0 || score < 60) return "REJECTED";
  if (score >= 90 && coverTechnicalStatus === "TECHNICALLY_VERIFIED") return "FEATURED";
  if (score >= 80) return "GOLD";
  return "REVIEW";
}

export function hardRejectReasons(input: {
  title: string;
  authors: string[];
  providerBookId: string | null;
  sourceUrl: string | null;
  isbn10: string | null;
  isbn13: string | null;
  coverTechnicalStatus: GoldCatalogRecord["coverTechnicalStatus"];
}): string[] {
  const reasons: string[] = [];
  if (!normalizeText(input.title)) reasons.push("EMPTY_TITLE");
  if (input.authors.length === 0) reasons.push("EMPTY_AUTHOR");
  if (hasSyntheticPattern(input.title)) reasons.push("SYNTHETIC_TITLE_PATTERN");
  if (input.authors.some((author) => hasSyntheticPattern(author))) reasons.push("SYNTHETIC_AUTHOR_PATTERN");
  if (!input.providerBookId) reasons.push("MISSING_STABLE_PROVIDER_ID");
  if (!input.sourceUrl) reasons.push("MISSING_SOURCE_URL");
  if ((input.isbn10 && !isValidIsbn10(input.isbn10)) || (input.isbn13 && !isValidIsbn13(input.isbn13))) reasons.push("INVALID_ISBN_CHECKSUM");
  if (input.coverTechnicalStatus === "TECHNICALLY_INVALID") reasons.push("COVER_TECHNICALLY_INVALID");
  return reasons;
}
