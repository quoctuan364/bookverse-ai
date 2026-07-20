import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

import { isUsableCoverDimensions } from "@/lib/cover-policy";

interface ManifestRecord {
  bookId: string;
  title: string;
  authors: string[];
  isbn: string | null;
  coverId: number;
  coverUrl: string;
  openLibraryWorkKey: string;
  openLibraryEditionKey: string | null;
  sourcePageUrl: string;
  matchStatus: string;
  rightsStatus: string;
}

interface CoverManifest {
  recordCount: number;
  covers: ManifestRecord[];
}

interface ValidationRecord {
  bookId: string;
  status: string;
  sourceBytes: number | null;
  sourceWidth: number | null;
  sourceHeight: number | null;
}

interface ValidationReport {
  records: ValidationRecord[];
}

const root = process.cwd();
const packRoot = path.resolve(
  process.env.REAL_COVER_PACK_DIR ??
    path.join(root, ".runtime", "real-cover-localization", "BookVerse_Real_Covers_3046_Local"),
);
const sourceDir = path.join(packRoot, "covers");
const manifestPath = path.join(packRoot, "cover-manifest-3046.json");
const validationPath = path.join(packRoot, "local-cover-validation-current.json");
const outputDir = path.resolve(root, "public", "covers", "real-catalog-local-normalized");
const provenancePath = path.resolve(root, "config", "real-cover-local-normalized-manifest.json");

function sha256File(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

async function createDerivative(sourcePath: string, destinationPath: string): Promise<void> {
  const contained = await sharp(sourcePath)
    .resize(560, 860, {
      fit: "contain",
      background: { r: 248, g: 246, b: 240, alpha: 1 },
    })
    .webp({ quality: 90, effort: 4 })
    .toBuffer();
  await sharp({
    create: {
      width: 600,
      height: 900,
      channels: 4,
      background: { r: 248, g: 246, b: 240, alpha: 1 },
    },
  })
    .composite([{ input: contained, gravity: "centre" }])
    .webp({ quality: 88, effort: 4 })
    .toFile(destinationPath);
}

async function main(): Promise<void> {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as CoverManifest;
  const validation = JSON.parse(fs.readFileSync(validationPath, "utf8")) as ValidationReport;
  const validationById = new Map(validation.records.map((record) => [record.bookId, record]));
  const candidates = manifest.covers
    .filter((record) => {
      const validationRecord = validationById.get(record.bookId);
      return Boolean(
        validationRecord &&
          validationRecord.sourceWidth !== null &&
          validationRecord.sourceHeight !== null &&
          !isUsableCoverDimensions(validationRecord.sourceWidth, validationRecord.sourceHeight),
      );
    })
    .sort((left, right) => left.bookId.localeCompare(right.bookId));

  fs.mkdirSync(outputDir, { recursive: true });
  const records: Array<Record<string, unknown>> = [];
  for (const record of candidates) {
    const validationRecord = validationById.get(record.bookId);
    const sourcePath = path.join(sourceDir, `${record.bookId}.jpg`);
    const destinationPath = path.join(outputDir, `${record.bookId}.webp`);
    if (!validationRecord || !fs.existsSync(sourcePath) || !validationRecord.sourceWidth || !validationRecord.sourceHeight) {
      throw new Error(`DERIVATIVE_SOURCE_MISSING:${record.bookId}`);
    }
    if (record.matchStatus !== "SOURCE_RECORD_LINKED") {
      throw new Error(`DERIVATIVE_SOURCE_NOT_LINKED:${record.bookId}`);
    }
    if (isUsableCoverDimensions(validationRecord.sourceWidth, validationRecord.sourceHeight)) {
      throw new Error(`DERIVATIVE_SOURCE_ALREADY_PORTRAIT:${record.bookId}`);
    }

    await createDerivative(sourcePath, destinationPath);
    const derivativeMetadata = await sharp(destinationPath).metadata();
    await sharp(destinationPath).toBuffer();
    if (derivativeMetadata.width !== 600 || derivativeMetadata.height !== 900) {
      throw new Error(`DERIVATIVE_DIMENSIONS_INVALID:${record.bookId}`);
    }

    records.push({
      bookId: record.bookId,
      title: record.title,
      authors: record.authors,
      isbn: record.isbn,
      sourceWorkKey: record.openLibraryWorkKey,
      sourceEditionKey: record.openLibraryEditionKey,
      sourcePageUrl: record.sourcePageUrl,
      sourceCoverId: record.coverId,
      sourceUrl: record.coverUrl,
      sourceFile: `covers/${record.bookId}.jpg`,
      sourceWidth: validationRecord.sourceWidth,
      sourceHeight: validationRecord.sourceHeight,
      sourceBytes: validationRecord.sourceBytes,
      sourceChecksumSha256: sha256File(sourcePath),
      derivativeFile: `public/covers/real-catalog-local-normalized/${record.bookId}.webp`,
      derivativeWidth: derivativeMetadata.width,
      derivativeHeight: derivativeMetadata.height,
      derivativeMime: "image/webp",
      derivativeChecksumSha256: sha256File(destinationPath),
      derivativeStatus: "LOCAL_DERIVATIVE_FROM_VERIFIED_SOURCE",
      sourceMatchEvidence: "SOURCE_RECORD_LINKED_EXACT_COVER_ID_AND_EDITION_KEY",
      semanticVisualReview: "NOT_PERFORMED",
      rightsStatus: "RIGHTS_NOT_VERIFIED",
    });
  }

  const report = {
    schemaVersion: 1,
    sourceManifest: "cover-manifest-3046.json",
    derivativeCount: records.length,
    outputPattern: "/covers/real-catalog-local-normalized/{bookId}.webp",
    dimensions: "600x900",
    sourceContentPreserved: true,
    crop: false,
    stretch: false,
    semanticStatus: "SOURCE_LINKED_NOT_VISUALLY_REVIEWED",
    rightsStatus: "RIGHTS_NOT_VERIFIED",
    records,
  };
  fs.writeFileSync(provenancePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ derivativeCount: records.length, dimensions: "600x900", rightsStatus: "RIGHTS_NOT_VERIFIED" }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
