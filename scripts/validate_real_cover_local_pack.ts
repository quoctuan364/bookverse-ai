import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

import { COVER_POLICY, isUsableCoverDimensions, isValidCoverImageBytes } from "@/lib/cover-policy";

type AssetStatus =
  | "VALID_LOCAL_PORTRAIT"
  | "VALID_LOCAL_NORMALIZED"
  | "VALID_REMOTE_ONLY"
  | "VALID_FALLBACK_ONLY"
  | "WRONG_SEMANTIC_MATCH"
  | "DECODE_FAILED"
  | "MISSING"
  | "NEEDS_REVIEW";

interface ManifestRecord {
  bookId: string;
  title: string;
  authors: string[];
  isbn: string | null;
  coverUrl: string;
  coverId: number;
  openLibraryWorkKey: string;
  openLibraryEditionKey: string | null;
  sourcePageUrl: string;
  matchStatus: string;
}

interface CoverManifest {
  recordCount: number;
  covers: ManifestRecord[];
}

interface RemoteFallbackRecord {
  bookId: string;
  status: string;
  matchEvidence: string;
}

interface RemoteFallbackManifest {
  records: RemoteFallbackRecord[];
}

interface ValidationRecord {
  bookId: string;
  status: AssetStatus;
  title: string;
  author: string;
  isbn: string | null;
  sourceWorkKey: string;
  sourceEditionKey: string | null;
  sourcePageUrl: string;
  sourceCoverId: number;
  sourceUrl: string;
  sourceFile: string | null;
  sourceChecksumSha256: string | null;
  sourceBytes: number | null;
  sourceWidth: number | null;
  sourceHeight: number | null;
  sourceMime: string | null;
  derivativeFile: string | null;
  derivativeChecksumSha256: string | null;
  derivativeWidth: number | null;
  derivativeHeight: number | null;
  semanticStatus: "SOURCE_LINKED_NOT_VISUALLY_REVIEWED" | "NEEDS_REVIEW";
  error?: string;
}

const root = process.cwd();
const packRoot = path.resolve(
  process.env.REAL_COVER_PACK_DIR ??
    path.join(root, ".runtime", "real-cover-localization", "BookVerse_Real_Covers_3046_Local"),
);
const manifestPath = path.join(packRoot, "cover-manifest-3046.json");
const coversRoot = path.join(packRoot, "covers");
const normalizedRoot = path.resolve(root, "public", "covers", "real-catalog-local-normalized");
const reportPath = path.join(packRoot, "local-cover-validation-current.json");
const remoteFallbackPath = fs.existsSync(path.join(packRoot, "real-cover-remote-fallback-manifest.json"))
  ? path.join(packRoot, "real-cover-remote-fallback-manifest.json")
  : path.resolve(root, "config", "real-cover-remote-fallback-manifest.json");

function sha256File(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function countBy(values: string[]): Record<string, number> {
  return Object.fromEntries(
    [...new Set(values)].sort().map((value) => [value, values.filter((item) => item === value).length]),
  );
}

async function inspectImage(filePath: string): Promise<{
  bytes: number;
  width: number | null;
  height: number | null;
  mime: string | null;
}> {
  const bytes = fs.statSync(filePath).size;
  const metadata = await sharp(filePath).metadata();
  // toBuffer buộc giải mã pixel, không chỉ đọc header.
  await sharp(filePath).toBuffer();
  return {
    bytes,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    mime: metadata.format ? `image/${metadata.format}` : null,
  };
}

async function validateRecord(
  record: ManifestRecord,
  fallbackById: Map<string, RemoteFallbackRecord>,
): Promise<ValidationRecord> {
  const sourcePath = path.join(coversRoot, `${record.bookId}.jpg`);
  const base = {
    bookId: record.bookId,
    title: record.title,
    author: record.authors.join(", "),
    isbn: record.isbn,
    sourceWorkKey: record.openLibraryWorkKey,
    sourceEditionKey: record.openLibraryEditionKey,
    sourcePageUrl: record.sourcePageUrl,
    sourceCoverId: record.coverId,
    sourceUrl: record.coverUrl,
    sourceFile: fs.existsSync(sourcePath) ? `covers/${record.bookId}.jpg` : null,
    sourceChecksumSha256: null,
    sourceBytes: null,
    sourceWidth: null,
    sourceHeight: null,
    sourceMime: null,
    derivativeFile: null,
    derivativeChecksumSha256: null,
    derivativeWidth: null,
    derivativeHeight: null,
    semanticStatus:
      record.matchStatus === "SOURCE_RECORD_LINKED"
        ? ("SOURCE_LINKED_NOT_VISUALLY_REVIEWED" as const)
        : ("NEEDS_REVIEW" as const),
  };

  if (!fs.existsSync(sourcePath)) {
    const fallback = fallbackById.get(record.bookId);
    return {
      ...base,
      status: fallback?.status === "REMOTE_UNAVAILABLE" ? "VALID_FALLBACK_ONLY" : "MISSING",
      error: fallback?.matchEvidence,
    };
  }

  try {
    const source = await inspectImage(sourcePath);
    const sourceValid =
      isValidCoverImageBytes(source.bytes) &&
      source.width !== null &&
      source.height !== null &&
      isUsableCoverDimensions(source.width, source.height);
    const sourceInfo = {
      ...base,
      sourceChecksumSha256: sha256File(sourcePath),
      sourceBytes: source.bytes,
      sourceWidth: source.width,
      sourceHeight: source.height,
      sourceMime: source.mime,
    };
    if (sourceValid) {
      return { ...sourceInfo, status: "VALID_LOCAL_PORTRAIT" };
    }

    const derivativePath = path.join(normalizedRoot, `${record.bookId}.webp`);
    if (!fs.existsSync(derivativePath)) {
      return { ...sourceInfo, status: "NEEDS_REVIEW" };
    }
    const derivative = await inspectImage(derivativePath);
    if (derivative.width !== 600 || derivative.height !== 900 || derivative.mime !== "image/webp") {
      return {
        ...sourceInfo,
        status: "DECODE_FAILED",
        derivativeFile: `public/covers/real-catalog-local-normalized/${record.bookId}.webp`,
        error: "NORMALIZED_DERIVATIVE_DIMENSION_OR_MIME_INVALID",
      };
    }
    return {
      ...sourceInfo,
      status: "VALID_LOCAL_NORMALIZED",
      derivativeFile: `public/covers/real-catalog-local-normalized/${record.bookId}.webp`,
      derivativeChecksumSha256: sha256File(derivativePath),
      derivativeWidth: derivative.width,
      derivativeHeight: derivative.height,
    };
  } catch (error: unknown) {
    return {
      ...base,
      status: "DECODE_FAILED",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main(): Promise<void> {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as CoverManifest;
  const fallbackManifest = JSON.parse(fs.readFileSync(remoteFallbackPath, "utf8")) as RemoteFallbackManifest;
  const fallbackById = new Map(fallbackManifest.records.map((record) => [record.bookId, record]));
  const results: ValidationRecord[] = [];
  for (const record of manifest.covers) {
    results.push(await validateRecord(record, fallbackById));
  }

  const accepted = new Set<AssetStatus>([
    "VALID_LOCAL_PORTRAIT",
    "VALID_LOCAL_NORMALIZED",
    "VALID_REMOTE_ONLY",
    "VALID_FALLBACK_ONLY",
  ]);
  const report = {
    generatedAt: new Date().toISOString(),
    sourceManifest: path.relative(root, manifestPath).replaceAll("\\", "/"),
    expected: manifest.recordCount,
    inspected: results.length,
    rightsStatus: "RIGHTS_NOT_VERIFIED",
    statusCounts: countBy(results.map((result) => result.status)),
    decodedOriginal: results.filter((result) => result.sourceChecksumSha256 !== null).length,
    validLocalPortrait: results.filter((result) => result.status === "VALID_LOCAL_PORTRAIT").length,
    validLocalNormalized: results.filter((result) => result.status === "VALID_LOCAL_NORMALIZED").length,
    validRemoteOnly: results.filter((result) => result.status === "VALID_REMOTE_ONLY").length,
    validFallbackOnly: results.filter((result) => result.status === "VALID_FALLBACK_ONLY").length,
    semanticMatching: {
      exactSourceLinked: results.filter((result) => result.semanticStatus === "SOURCE_LINKED_NOT_VISUALLY_REVIEWED").length,
      visualReviewPerformed: 0,
      wrongSemanticMatch: results.filter((result) => result.status === "WRONG_SEMANTIC_MATCH").length,
      needsReview: results.filter((result) => result.status === "NEEDS_REVIEW").length,
    },
    records: results,
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...report, records: undefined }, null, 2));
  if (manifest.recordCount !== results.length || results.some((result) => !accepted.has(result.status))) {
    process.exitCode = 2;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
