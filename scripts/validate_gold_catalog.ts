import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

import {
  deriveGoldQualityTier,
  hasSyntheticPattern,
  isValidIsbn10,
  isValidIsbn13,
  sha256,
  stableStringify,
  type GoldCatalogRecord,
  type GoldQualityTier,
} from "@/lib/gold-catalog";

const root = process.cwd();
const outputRoot = path.join(root, "data", "gold-catalog-v1");
const normalizedPath = path.join(outputRoot, "normalized", "pilot-300.json");
const manifestPath = path.join(outputRoot, "manifests", "pilot-300-manifest.json");
const mappingPath = path.join(outputRoot, "manifests", "category-mapping-v1.json");
const reportPath = path.join(outputRoot, "reports", "quality-report.json");

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

function fail(message: string): never {
  throw new Error(`GOLD_VALIDATION_FAILED:${message}`);
}

function assertField(record: GoldCatalogRecord, field: keyof GoldCatalogRecord): void {
  if (!(field in record)) fail(`${record.catalogId}:MISSING_FIELD:${field}`);
}

function assertRecord(record: GoldCatalogRecord): void {
  const requiredFields: (keyof GoldCatalogRecord)[] = [
    "catalogId", "recordType", "title", "subtitle", "authors", "description", "language", "publisher",
    "publishedDate", "publishedYear", "isbn10", "isbn13", "pageCount", "sourceCategories", "canonicalCategoryKeys",
    "coverUrl", "coverProvider", "coverFinalUrl", "coverWidth", "coverHeight", "coverHttpStatus", "coverContentType",
    "coverTechnicalStatus", "coverRightsStatus", "provider", "providerBookId", "providerWorkId", "providerEditionId",
    "sourceUrl", "retrievedAt", "rawChecksum", "normalizedChecksum", "metadataQualityScore", "qualityTier", "rejectionReasons",
  ];
  for (const field of requiredFields) assertField(record, field);
  if (!record.catalogId || !record.title.trim() || record.authors.length === 0) fail(`${record.catalogId}:EMPTY_CORE_METADATA`);
  if (hasSyntheticPattern(record.title) || record.authors.some((author) => hasSyntheticPattern(author))) fail(`${record.catalogId}:SYNTHETIC_PATTERN`);
  if (!record.providerBookId || !record.sourceUrl || !/^https:\/\/openlibrary\.org\//u.test(record.sourceUrl)) fail(`${record.catalogId}:PROVENANCE_MISSING_OR_UNTRUSTED`);
  if (record.isbn10 && !isValidIsbn10(record.isbn10)) fail(`${record.catalogId}:INVALID_ISBN10`);
  if (record.isbn13 && !isValidIsbn13(record.isbn13)) fail(`${record.catalogId}:INVALID_ISBN13`);
  if (record.coverRightsStatus !== "RIGHTS_NOT_VERIFIED") fail(`${record.catalogId}:RIGHTS_STATUS_MUST_REMAIN_UNVERIFIED`);
  if (record.coverTechnicalStatus === "TECHNICALLY_VERIFIED") {
    if (record.coverHttpStatus !== 200 || !record.coverFinalUrl || !record.coverContentType?.toLowerCase().startsWith("image/") || !record.coverWidth || !record.coverHeight) {
      fail(`${record.catalogId}:COVER_VERIFIED_FIELDS_INCOHERENT`);
    }
  }
  if (!Number.isInteger(record.metadataQualityScore) || record.metadataQualityScore < 0 || record.metadataQualityScore > 100) fail(`${record.catalogId}:INVALID_SCORE`);
  const expectedTier = deriveGoldQualityTier(record.metadataQualityScore, record.coverTechnicalStatus, record.rejectionReasons);
  if (record.qualityTier !== expectedTier) fail(`${record.catalogId}:TIER_MISMATCH`);
  const forbiddenKeys = ["price", "stock", "listing", "impression", "click", "conversion", "ctr"];
  for (const key of forbiddenKeys) if (key in record) fail(`${record.catalogId}:FORBIDDEN_FIELD:${key}`);
}

async function main(): Promise<void> {
  const records = await readJson<GoldCatalogRecord[]>(normalizedPath);
  const manifest = await readJson<{ pilotLimit: number; selectedCount: number; artifactChecksum: string; recordIds: string[]; qualityCounts: Record<GoldQualityTier, number> }>(manifestPath);
  const mapping = await readJson<{ sourceCatalogChecksum: string; checksum: string; entries: Array<{ sourceSlug: string; confidence: string; reviewerStatus: string }> }>(mappingPath);
  const qualityReport = await readJson<{ selectedRecordIds: string[]; qualityCounts: Record<GoldQualityTier, number> }>(reportPath);
  const payload = JSON.stringify(records, null, 2);
  const errors: string[] = [];
  try {
    assert.equal(sha256(payload), manifest.artifactChecksum, "artifact checksum");
    assert.equal(records.length, manifest.selectedCount, "selected count");
    assert.deepEqual(records.map((record) => record.catalogId), manifest.recordIds, "record id order");
    assert.deepEqual(qualityReport.selectedRecordIds, manifest.recordIds, "quality report ids");
    assert.deepEqual(qualityReport.qualityCounts, manifest.qualityCounts, "quality report counts");
    const ids = new Set<string>();
    const providerIds = new Set<string>();
    const isbnIds = new Set<string>();
    for (const record of records) {
      assertRecord(record);
      if (ids.has(record.catalogId)) fail(`${record.catalogId}:DUPLICATE_CATALOG_ID`);
      ids.add(record.catalogId);
      if (providerIds.has(record.providerBookId!)) fail(`${record.catalogId}:DUPLICATE_PROVIDER_ID`);
      providerIds.add(record.providerBookId!);
      for (const isbn of [record.isbn10, record.isbn13].filter((value): value is string => Boolean(value))) {
        if (isbnIds.has(isbn)) fail(`${record.catalogId}:DUPLICATE_ISBN`);
        isbnIds.add(isbn);
      }
    }
    const mappingChecksum = sha256(stableStringify(mapping.entries));
    assert.equal(mappingChecksum, mapping.checksum, "category mapping checksum");
    for (const entry of mapping.entries) {
      if (entry.confidence === "LOW" && entry.reviewerStatus !== "NEEDS_REVIEW") fail(`${entry.sourceSlug}:LOW_MAPPING_NOT_REVIEWED`);
    }
  } catch (error: unknown) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  const status = errors.length === 0 ? (records.length >= manifest.pilotLimit ? "VERIFIED" : "PARTIAL") : "FAILED";
  const output = { status, selectedCount: records.length, pilotLimit: manifest.pilotLimit, errors, sourceCatalogChecksum: mapping.sourceCatalogChecksum, artifactChecksum: manifest.artifactChecksum };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  if (errors.length > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
