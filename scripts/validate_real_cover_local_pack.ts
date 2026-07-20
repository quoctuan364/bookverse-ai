import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

import {
  isUsableCoverDimensions,
  isValidCoverImageBytes,
  COVER_POLICY,
} from "@/lib/cover-policy";

interface ManifestRecord {
  bookId: string;
  coverUrl: string;
}

interface CoverManifest {
  recordCount: number;
  covers: ManifestRecord[];
}

const root = process.cwd();
const packRoot = path.resolve(
  process.env.REAL_COVER_PACK_DIR ??
    path.join(root, ".runtime", "real-cover-localization", "BookVerse_Real_Covers_3046_Local"),
);
const manifestPath = path.join(packRoot, "cover-manifest-3046.json");
const coversRoot = path.join(packRoot, "covers");
const reportPath = path.join(packRoot, "local-cover-validation-current.json");

function countBy(values: string[]): Record<string, number> {
  return Object.fromEntries(
    [...new Set(values)].sort().map((value) => [value, values.filter((item) => item === value).length]),
  );
}

async function validateRecord(record: ManifestRecord) {
  const filePath = path.join(coversRoot, `${record.bookId}.jpg`);
  if (!fs.existsSync(filePath)) {
    return { bookId: record.bookId, status: "MISSING", file: null, bytes: null, width: null, height: null };
  }

  const bytes = fs.statSync(filePath).size;
  try {
    const metadata = await sharp(filePath).metadata();
    // toBuffer buộc giải mã pixel, không chỉ đọc header JPEG.
    await sharp(filePath).toBuffer();
    const width = metadata.width ?? null;
    const height = metadata.height ?? null;
    const validBytes = isValidCoverImageBytes(bytes);
    const validDimensions = width !== null && height !== null && isUsableCoverDimensions(width, height);
    const status = validBytes && validDimensions
      ? "VALID_PORTRAIT"
      : !validBytes
        ? "DECODED_INVALID_BYTES"
        : "DECODED_NON_PORTRAIT";
    return {
      bookId: record.bookId,
      status,
      file: `covers/${record.bookId}.jpg`,
      bytes,
      width,
      height,
    };
  } catch (error: unknown) {
    return {
      bookId: record.bookId,
      status: "INVALID_DECODE",
      file: `covers/${record.bookId}.jpg`,
      bytes,
      width: null,
      height: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main(): Promise<void> {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as CoverManifest;
  const records = manifest.covers;
  const results = [];
  for (const record of records) {
    results.push(await validateRecord(record));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    sourceManifest: path.relative(root, manifestPath).replaceAll("\\", "/"),
    expected: manifest.recordCount,
    inspected: records.length,
    rightsStatus: COVER_POLICY.rightsStatus,
    statusCounts: countBy(results.map((result) => result.status)),
    decoded: results.filter((result) => result.status !== "MISSING" && result.status !== "INVALID_DECODE").length,
    validPortrait: results.filter((result) => result.status === "VALID_PORTRAIT").length,
    rejected: results.filter((result) => result.status === "MISSING" || result.status === "INVALID_DECODE" || result.status === "DECODED_INVALID_BYTES" || result.status === "DECODED_NON_PORTRAIT").length,
    records: results,
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...report, records: undefined }, null, 2));
  if (manifest.recordCount !== records.length || results.some((result) => result.status !== "VALID_PORTRAIT")) {
    process.exitCode = 2;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
